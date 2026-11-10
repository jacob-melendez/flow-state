// Database tests for friends (supabase/migrations/20261111000000_friends.sql).
// Run with: npm run test:db
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';

import { applyRemainingMigrations, asAdmin, asUser, createDb, localDate, signUp } from './helpers.mjs';

let db;
let alice;
let bob;
let carol;

const call = async (as, sql, params = []) => {
  await asUser(db, as);
  const { rows } = await db.query(sql, params);
  return rows;
};
const send = async (as, { code = null, email = null }) =>
  (await call(as, 'select public.send_friend_request($1, $2) as r', [code, email]))[0].r;
const friendsOf = (as) => call(as, 'select * from public.get_friends()');
const codeOf = async (id) => {
  await asAdmin(db);
  return (await db.query('select friend_code from public.profiles where id = $1', [id])).rows[0].friend_code;
};
const pendingId = async (from, to) => {
  await asAdmin(db);
  return (await db.query('select id from public.friendships where requester = $1 and addressee = $2', [from, to])).rows[0]?.id;
};
const respond = async (as, id, accept) =>
  (await call(as, 'select public.respond_friend_request($1, $2) as r', [id, accept]))[0].r;
const remove = async (as, other, block = false) =>
  (await call(as, 'select public.remove_friend($1, $2) as r', [other, block]))[0].r;
const makeFriends = async (a, b) => {
  assert.equal(await send(a, { code: await codeOf(b) }), 'sent');
  assert.equal(await respond(b, await pendingId(a, b), true), 'accepted');
};

/** Logs cups for a user on a local date (as their phone would upload them). */
async function logCups(user, date, cups, { deleted = false } = {}) {
  await asUser(db, user);
  for (let i = 0; i < cups; i++) {
    await db.query(
      `insert into public.drink_entries (id, user_id, logged_at, local_date, cups, updated_at, deleted_at)
       values ($1, $2, now(), $3, 1, now(), $4)`,
      [randomUUID(), user, date, deleted ? new Date() : null],
    );
  }
}
async function setDayGoal(user, date, goal) {
  await asUser(db, user);
  await db.query(
    `insert into public.daily_goals (user_id, local_date, goal, updated_at) values ($1, $2, $3, now())`,
    [user, date, goal],
  );
}

beforeEach(async () => {
  db = await createDb();
  alice = await signUp(db, 'alice@stanford.edu', { name: 'Alice' });
  bob = await signUp(db, 'bob@stanford.edu', { name: 'Bob' });
  carol = await signUp(db, 'carol@stanford.edu', { name: 'Carol' });
});

describe('friend codes', () => {
  it('every profile gets a unique, readable 8-character code', async () => {
    await asAdmin(db);
    const codes = (await db.query('select friend_code from public.profiles')).rows.map((r) => r.friend_code);
    assert.equal(new Set(codes).size, 3);
    for (const c of codes) assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
  });

  it('profiles created before this migration get codes too', async () => {
    const old = await createDb(1);
    await old.query("insert into auth.users (email) values ('early@stanford.edu')");
    await applyRemainingMigrations(old, 1);
    const { rows } = await old.query('select friend_code from public.profiles');
    assert.match(rows[0].friend_code, /^[A-Z2-9]{8}$/);
  });

  it("students can see their own code but can't change it", async () => {
    const [mine] = await call(alice, 'select friend_code, discoverable_by_email from public.profiles');
    assert.equal(mine.discoverable_by_email, true);
    await call(alice, "update public.profiles set friend_code = 'AAAAAAAA'");
    assert.equal((await call(alice, 'select friend_code from public.profiles'))[0].friend_code, mine.friend_code);
  });
});

describe('sending requests', () => {
  it('works by code (ignoring case, spaces and dashes)', async () => {
    const code = await codeOf(bob);
    const messy = `${code.slice(0, 4).toLowerCase()}- ${code.slice(4)}`;
    assert.equal(await send(alice, { code: messy }), 'sent');
    assert.equal(await send(alice, { code }), 'already_requested');
  });

  it('works by exact email, unless the student turned email search off', async () => {
    assert.equal(await send(alice, { email: ' BOB@stanford.edu ' }), 'sent');
    await call(carol, 'update public.profiles set discoverable_by_email = false');
    assert.equal(await send(alice, { email: 'carol@stanford.edu' }), 'not_found');
    assert.equal(await send(alice, { code: await codeOf(carol) }), 'sent'); // codes still work
  });

  it('reports unknown people, yourself, and a missing name', async () => {
    assert.equal(await send(alice, { code: 'ZZZZZZZZ' }), 'not_found');
    assert.equal(await send(alice, { email: 'nobody@stanford.edu' }), 'not_found');
    assert.equal(await send(alice, { email: 'bo%@stanford.edu' }), 'not_found'); // no wildcards
    assert.equal(await send(alice, { code: await codeOf(alice) }), 'self');
    const dave = await signUp(db, 'dave@stanford.edu');
    assert.equal(await send(dave, { code: await codeOf(alice) }), 'needs_name');
  });

  it('two students requesting each other become friends', async () => {
    assert.equal(await send(alice, { code: await codeOf(bob) }), 'sent');
    assert.equal(await send(bob, { code: await codeOf(alice) }), 'accepted');
    assert.equal(await send(alice, { code: await codeOf(bob) }), 'already_friends');
  });

  it('limits pending outgoing requests', async () => {
    for (let i = 0; i < 50; i++) {
      const id = await signUp(db, `s${i}@stanford.edu`);
      assert.equal(await send(alice, { code: await codeOf(id) }), 'sent');
    }
    assert.equal(await send(alice, { code: await codeOf(bob) }), 'too_many');
  });
});

describe('responding', () => {
  it('only the person asked can accept or decline', async () => {
    await send(alice, { code: await codeOf(bob) });
    const id = await pendingId(alice, bob);
    assert.equal(await respond(alice, id, true), 'not_found');
    assert.equal(await respond(carol, id, true), 'not_found');
    assert.equal(await respond(bob, id, false), 'declined');
    assert.equal(await pendingId(alice, bob), undefined);
    assert.equal(await send(alice, { code: await codeOf(bob) }), 'sent'); // can ask again later
  });

  it("students can't write friendships directly", async () => {
    await asUser(db, alice);
    await assert.rejects(
      db.query("insert into public.friendships (requester, addressee, status) values ($1, $2, 'accepted')", [alice, bob]),
      /permission denied/,
    );
    await send(alice, { code: await codeOf(bob) });
    await asUser(db, alice);
    await assert.rejects(db.query("update public.friendships set status = 'accepted'"), /permission denied/);
    await assert.rejects(db.query('delete from public.friendships'), /permission denied/);
  });
});

describe('what each student sees', () => {
  it('requests show name and email; friends show progress but not email', async () => {
    await send(alice, { code: await codeOf(bob) });
    await send(carol, { email: 'alice@stanford.edu' });
    await makeFriends(alice, await signUp(db, 'dan@stanford.edu', { name: 'Dan' }));

    const rows = await friendsOf(alice);
    const byName = Object.fromEntries(rows.map((r) => [r.display_name, r]));
    assert.equal(byName.Bob.status, 'outgoing');
    assert.equal(byName.Bob.email, null);
    assert.equal(byName.Bob.today_cups, null);
    assert.equal(byName.Carol.status, 'incoming');
    assert.equal(byName.Carol.email, 'carol@stanford.edu');
    assert.equal(byName.Carol.streak, null);
    assert.equal(byName.Dan.status, 'friend');
    assert.equal(byName.Dan.email, null);
    assert.equal(byName.Dan.today_cups, 0);
    assert.equal(byName.Dan.today_goal, 8);
    assert.equal(byName.Dan.streak, 0);
  });

  it("friends' data is still unreadable directly", async () => {
    await makeFriends(alice, bob);
    await logCups(bob, localDate(), 3);
    assert.equal((await call(alice, 'select * from public.drink_entries')).length, 0);
    assert.deepEqual(
      (await call(alice, 'select display_name from public.profiles')).map((r) => r.display_name),
      ['Alice'],
    );
  });

  it("today's cups use the friend's timezone and skip removed cups", async () => {
    await makeFriends(alice, bob);
    const tz = 'Pacific/Kiritimati'; // UTC+14: often already "tomorrow" in California
    await call(bob, 'update public.profiles set timezone = $1', [tz]);
    await logCups(bob, localDate(tz), 3);
    await logCups(bob, localDate(tz), 2, { deleted: true });
    await logCups(bob, localDate(tz, -1), 5);
    const [row] = await friendsOf(alice);
    assert.equal(row.today_cups, 3);
  });

  it('an invalid timezone falls back to Stanford time', async () => {
    await makeFriends(alice, bob);
    await call(bob, "update public.profiles set timezone = 'Not/AZone'");
    await logCups(bob, localDate(), 2);
    assert.equal((await friendsOf(alice))[0].today_cups, 2);
  });

  it("uses that day's goal, else the friend's current goal", async () => {
    await makeFriends(alice, bob);
    await call(bob, "update public.profiles set daily_goal = 10, daily_goal_updated_at = now()");
    assert.equal((await friendsOf(alice))[0].today_goal, 10);
    await setDayGoal(bob, localDate(), 6);
    assert.equal((await friendsOf(alice))[0].today_goal, 6);
  });
});

describe('streaks (same rules as the app)', () => {
  beforeEach(() => makeFriends(alice, bob));
  const streak = async () => (await friendsOf(alice))[0].streak;

  it("counts through yesterday while today's goal isn't met, and includes today once it is", async () => {
    await logCups(bob, localDate('America/Los_Angeles', -2), 8);
    await logCups(bob, localDate('America/Los_Angeles', -1), 8);
    await logCups(bob, localDate(), 3);
    assert.equal(await streak(), 2);
    await logCups(bob, localDate(), 5);
    assert.equal(await streak(), 3);
  });

  it('a missed day breaks the streak; removed cups do not count', async () => {
    await logCups(bob, localDate('America/Los_Angeles', -3), 8);
    await logCups(bob, localDate('America/Los_Angeles', -2), 7);
    await logCups(bob, localDate('America/Los_Angeles', -2), 1, { deleted: true });
    await logCups(bob, localDate('America/Los_Angeles', -1), 8);
    assert.equal(await streak(), 1);
  });

  it("uses each day's own goal", async () => {
    await setDayGoal(bob, localDate('America/Los_Angeles', -2), 3);
    await logCups(bob, localDate('America/Los_Angeles', -2), 3);
    await logCups(bob, localDate('America/Los_Angeles', -1), 8);
    assert.equal(await streak(), 2);
  });
});

describe('removing and blocking', () => {
  it('removing ends the friendship for both', async () => {
    await makeFriends(alice, bob);
    assert.equal(await remove(bob, alice), 'removed');
    assert.equal((await friendsOf(alice)).length, 0);
    assert.equal((await friendsOf(bob)).length, 0);
  });

  it('removing cancels a sent request', async () => {
    await send(alice, { code: await codeOf(bob) });
    await remove(alice, bob);
    assert.equal((await friendsOf(bob)).length, 0);
  });

  it("a blocked student can't send requests and can't tell they're blocked", async () => {
    await send(bob, { code: await codeOf(alice) });
    assert.equal(await remove(alice, bob, true), 'blocked');
    assert.equal((await friendsOf(alice)).length, 0);
    assert.equal((await friendsOf(bob)).length, 0);
    assert.equal(await send(bob, { code: await codeOf(alice) }), 'not_found');
    assert.equal(await send(bob, { email: 'alice@stanford.edu' }), 'not_found');
    assert.equal((await call(bob, 'select * from public.friendships')).length, 0);
    // Bob removing on his side doesn't lift Alice's block.
    await remove(bob, alice);
    assert.equal(await send(bob, { code: await codeOf(alice) }), 'not_found');
  });

  it('the blocker can re-add (which unblocks and sends a request)', async () => {
    await remove(alice, bob, true);
    assert.equal(await send(alice, { code: await codeOf(bob) }), 'sent');
    assert.equal((await friendsOf(bob))[0].status, 'incoming');
  });

  it('deleting an account removes its friendships', async () => {
    await makeFriends(alice, bob);
    await call(bob, 'select public.delete_my_account()');
    assert.equal((await friendsOf(alice)).length, 0);
  });
});

describe('access', () => {
  it('signed-out visitors and helper functions are locked down', async () => {
    await asAdmin(db);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.get_friends()'), /permission denied/);
    await assert.rejects(db.query("select public.send_friend_request('ABCDEFGH', null)"), /permission denied/);
    await asUser(db, alice);
    await assert.rejects(db.query('select public.current_streak($1, current_date)', [bob]), /permission denied/);
    await assert.rejects(db.query('select public.generate_friend_code()'), /permission denied/);
  });
});
