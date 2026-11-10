// Database tests for the accounts/sync migration, run in an in-process Postgres.
// Run with: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const stub = readFileSync(join(root, 'tests/auth-stub.sql'), 'utf8');
const migrations = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

let db;

async function freshDb() {
  db = new PGlite();
  await db.exec(stub);
  for (const sql of migrations) await db.exec(sql);
}

/** Creates a login (as Supabase Auth would) and returns its id. */
async function signUp(email) {
  await asAdmin();
  const { rows } = await db.query('insert into auth.users (email) values ($1) returning id', [email]);
  return rows[0].id;
}

async function asAdmin() {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}

/** Runs the following queries as a signed-in user, with RLS applied. */
async function asUser(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
}

async function asAnon() {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec('set role anon');
}

const entry = (id, updatedAt, extra = {}) => ({
  id,
  logged_at: '2026-11-10T17:00:00Z',
  local_date: '2026-11-10',
  cups: 1,
  updated_at: updatedAt,
  deleted_at: null,
  ...extra,
});

async function upsertEntry(userId, e) {
  return db.query(
    `insert into public.drink_entries (id, user_id, logged_at, local_date, cups, updated_at, deleted_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set logged_at = excluded.logged_at, local_date = excluded.local_date,
       cups = excluded.cups, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
    [e.id, userId, e.logged_at, e.local_date, e.cups, e.updated_at, e.deleted_at],
  );
}

const E1 = '11111111-1111-4111-8111-111111111111';
const E2 = '22222222-2222-4222-8222-222222222222';

describe('sign-up rules', () => {
  beforeEach(freshDb);

  it('accepts @stanford.edu emails and creates a profile', async () => {
    const id = await signUp('Cardinal@Stanford.edu');
    const { rows } = await db.query('select id, daily_goal, display_name from public.profiles');
    assert.deepEqual(rows, [{ id, daily_goal: 8, display_name: null }]);
  });

  it('rejects other email addresses', async () => {
    await assert.rejects(signUp('someone@gmail.com'), /Only @stanford.edu/);
    await assert.rejects(signUp('trick@notstanford.edu'), /Only @stanford.edu/);
    await assert.rejects(signUp('x@stanford.edu.evil.com'), /Only @stanford.edu/);
  });

  it('rejects changing an account to a non-Stanford email', async () => {
    const id = await signUp('a@stanford.edu');
    await assert.rejects(db.query('update auth.users set email = $1 where id = $2', ['a@gmail.com', id]), /Only @stanford.edu/);
  });
});

describe('row-level security', () => {
  let alice;
  let bob;
  beforeEach(async () => {
    await freshDb();
    alice = await signUp('alice@stanford.edu');
    bob = await signUp('bob@stanford.edu');
    await asUser(alice);
    await upsertEntry(alice, entry(E1, '2026-11-10T17:00:00Z'));
  });

  it('students see only their own entries, goals and profile', async () => {
    await asUser(alice);
    await db.query(`insert into public.daily_goals (user_id, local_date, goal, updated_at) values ($1, '2026-11-10', 9, now())`, [alice]);
    assert.equal((await db.query('select * from public.drink_entries')).rows.length, 1);
    await asUser(bob);
    assert.equal((await db.query('select * from public.drink_entries')).rows.length, 0);
    assert.equal((await db.query('select * from public.daily_goals')).rows.length, 0);
    const profiles = (await db.query('select id from public.profiles')).rows;
    assert.deepEqual(profiles, [{ id: bob }]);
  });

  it("can't write rows for someone else", async () => {
    await asUser(bob);
    await assert.rejects(upsertEntry(alice, entry(E2, '2026-11-10T17:00:00Z')), /row-level security/);
  });

  it("can't take over someone else's entry by reusing its id", async () => {
    await asUser(bob);
    await assert.rejects(upsertEntry(bob, entry(E1, '2026-11-11T00:00:00Z')), /row-level security|duplicate key/);
    await asUser(alice);
    const { rows } = await db.query('select updated_at from public.drink_entries where id = $1', [E1]);
    assert.equal(rows[0].updated_at.toISOString(), '2026-11-10T17:00:00.000Z');
  });

  it("can't change another student's profile", async () => {
    await asUser(bob);
    const res = await db.query("update public.profiles set display_name = 'hacked' where id = $1", [alice]);
    assert.equal(res.affectedRows, 0);
  });

  it('signed-out visitors have no access', async () => {
    await asAnon();
    await assert.rejects(db.query('select * from public.drink_entries'), /permission denied/);
    await assert.rejects(db.query('select * from public.profiles'), /permission denied/);
    await assert.rejects(db.query('select public.delete_my_account()'), /permission denied/);
  });
});

describe('sync rules', () => {
  let alice;
  beforeEach(async () => {
    await freshDb();
    alice = await signUp('alice@stanford.edu');
    await asUser(alice);
  });

  it('keeps the newest version when an older change arrives later', async () => {
    await upsertEntry(alice, entry(E1, '2026-11-10T18:00:00Z', { deleted_at: '2026-11-10T18:00:00Z' }));
    await upsertEntry(alice, entry(E1, '2026-11-10T17:00:00Z')); // stale phone
    const { rows } = await db.query('select deleted_at, updated_at from public.drink_entries');
    assert.equal(rows[0].updated_at.toISOString(), '2026-11-10T18:00:00.000Z');
    assert.ok(rows[0].deleted_at, 'deletion should survive');
  });

  it('accepts newer changes and moves synced_at forward', async () => {
    await upsertEntry(alice, entry(E1, '2026-11-10T17:00:00Z'));
    const first = (await db.query('select synced_at from public.drink_entries')).rows[0].synced_at;
    await upsertEntry(alice, entry(E1, '2026-11-10T19:00:00Z', { deleted_at: '2026-11-10T19:00:00Z' }));
    const { rows } = await db.query('select synced_at, deleted_at from public.drink_entries');
    assert.ok(rows[0].synced_at > first);
    assert.ok(rows[0].deleted_at);
  });

  it('applies newest-wins to daily goals and the profile goal', async () => {
    const upsertGoal = (goal, at) =>
      db.query(
        `insert into public.daily_goals (user_id, local_date, goal, updated_at) values ($1, '2026-11-10', $2, $3)
         on conflict (user_id, local_date) do update set goal = excluded.goal, updated_at = excluded.updated_at`,
        [alice, goal, at],
      );
    await upsertGoal(10, '2026-11-10T18:00:00Z');
    await upsertGoal(6, '2026-11-10T17:00:00Z');
    assert.equal((await db.query('select goal from public.daily_goals')).rows[0].goal, 10);

    await db.query("update public.profiles set daily_goal = 12, daily_goal_updated_at = '2026-11-10T18:00:00Z', display_name = 'Al'");
    await db.query("update public.profiles set daily_goal = 5, daily_goal_updated_at = '2026-11-10T17:00:00Z', timezone = 'America/Los_Angeles'");
    const { rows } = await db.query('select daily_goal, display_name, timezone from public.profiles');
    assert.deepEqual(rows[0], { daily_goal: 12, display_name: 'Al', timezone: 'America/Los_Angeles' });
  });

  it('rejects invalid values', async () => {
    await assert.rejects(upsertEntry(alice, entry(E1, '2026-11-10T17:00:00Z', { cups: 0 })), /check constraint/);
    await assert.rejects(db.query("update public.profiles set display_name = '   '"), /check constraint/);
    await assert.rejects(db.query('update public.profiles set daily_goal = 50'), /check constraint/);
  });
});

describe('delete_my_account', () => {
  beforeEach(freshDb);

  it("removes the caller's login and data, and nobody else's", async () => {
    const alice = await signUp('alice@stanford.edu');
    const bob = await signUp('bob@stanford.edu');
    await asUser(alice);
    await upsertEntry(alice, entry(E1, '2026-11-10T17:00:00Z'));
    await asUser(bob);
    await upsertEntry(bob, entry(E2, '2026-11-10T17:00:00Z'));

    await asUser(alice);
    await db.query('select public.delete_my_account()');

    await asAdmin();
    const users = (await db.query('select email from auth.users')).rows.map((r) => r.email);
    assert.deepEqual(users, ['bob@stanford.edu']);
    assert.deepEqual((await db.query('select id from public.drink_entries')).rows, [{ id: E2 }]);
    assert.deepEqual((await db.query('select id from public.profiles')).rows, [{ id: bob }]);
  });
});
