// Database tests for anonymous impact stats (20261112000000_impact_stats.sql).
// Run with: npm run test:db
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';

import { asAdmin, asUser, createDb, signUp } from './helpers.mjs';

let db;

async function asAnon() {
  await asAdmin(db);
  await db.exec('set role anon');
}

const report = (installId, date, cups, goal = 8, platform = 'ios', version = '2.0.0') =>
  db.query('select public.report_usage($1, $2, $3, $4, $5, $6)', [installId, date, cups, goal, version, platform]);

async function daysAgo(n) {
  const { rows } = await db.query(`select (current_date - $1::int)::text as d`, [n]);
  return rows[0].d;
}

async function rows() {
  await asAdmin(db);
  return (await db.query('select * from public.usage_daily order by local_date')).rows;
}

beforeEach(async () => {
  db = await createDb();
});

describe('report_usage', () => {
  it('accepts reports from signed-out installs and stores no account link', async () => {
    const yesterday = await daysAgo(1);
    await asAnon();
    await report(randomUUID(), yesterday, 9);
    const [row] = await rows();
    assert.equal(row.cups, 9);
    assert.equal(row.goal_met, true);
    assert.deepEqual(Object.keys(row).sort(), ['app_version', 'cups', 'goal', 'goal_met', 'install_id', 'local_date', 'platform', 'reported_at']);
  });

  it('also works for signed-in users', async () => {
    const alice = await signUp(db, 'alice@stanford.edu');
    await asUser(db, alice);
    await report(randomUUID(), await daysAgo(1), 3);
    assert.equal((await rows()).length, 1);
  });

  it('re-sending a day replaces it instead of double counting', async () => {
    const id = randomUUID();
    const d = await daysAgo(1);
    await asAnon();
    await report(id, d, 3);
    await report(id, d, 7);
    const all = await rows();
    assert.equal(all.length, 1);
    assert.equal(all[0].cups, 7);
    assert.equal(all[0].goal_met, false);
  });

  it('ignores old/future dates and bad platforms, and clamps numbers', async () => {
    const id = randomUUID();
    await asAnon();
    await report(id, await daysAgo(30), 5);
    await report(id, await daysAgo(-5), 5);
    await report(id, await daysAgo(1), 5, 8, 'blackberry');
    assert.equal((await rows()).length, 0);
    await asAnon();
    await report(id, await daysAgo(2), 999, 0, 'android', 'x'.repeat(50));
    const [row] = await rows();
    assert.equal(row.cups, 40);
    assert.equal(row.goal, 1);
    assert.equal(row.app_version.length, 20);
  });
});

describe('access', () => {
  it('nobody can read or write stats through the API', async () => {
    const alice = await signUp(db, 'alice@stanford.edu');
    for (const as of [asAnon, () => asUser(db, alice)]) {
      await as();
      await assert.rejects(db.query('select * from public.usage_daily'), /permission denied/);
      await assert.rejects(db.query('select * from public.impact_weekly'), /permission denied/);
      await assert.rejects(db.query('select * from public.impact_daily'), /permission denied/);
      await assert.rejects(
        db.query("insert into public.usage_daily values (gen_random_uuid(), current_date, 1, 8, false, '2', 'ios')"),
        /permission denied/,
      );
    }
  });
});

describe('team reports', () => {
  it('summarize active installs, cups and goal rate', async () => {
    const [a, b] = [randomUUID(), randomUUID()];
    await asAnon();
    await report(a, await daysAgo(1), 8);
    await report(b, await daysAgo(1), 4);
    await report(a, await daysAgo(2), 10);
    await asAdmin(db);
    const total = (await db.query('select sum(total_cups)::int as t, sum(active_days)::int as d from public.impact_weekly')).rows[0];
    assert.equal(total.t, 22);
    assert.equal(total.d, 3);
    const byDay = (await db.query("select active_installs::int, total_cups::int, pct_goal_met::float from public.impact_daily where local_date = current_date - 1")).rows[0];
    assert.deepEqual(byDay, { active_installs: 2, total_cups: 12, pct_goal_met: 50 });
  });
});
