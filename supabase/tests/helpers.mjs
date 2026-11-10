// Shared helpers for database tests: an in-process Postgres (PGlite) with a
// stand-in for Supabase's auth schema, plus helpers to act as different users.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const stub = readFileSync(join(root, 'tests/auth-stub.sql'), 'utf8');
export const migrationFiles = readdirSync(join(root, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();
const migrations = migrationFiles.map((f) => readFileSync(join(root, 'migrations', f), 'utf8'));

/** A fresh database with all migrations applied (or only the first `count`). */
export async function createDb(count = migrations.length) {
  const db = new PGlite();
  await db.exec(stub);
  for (const sql of migrations.slice(0, count)) await db.exec(sql);
  return db;
}

export async function applyRemainingMigrations(db, from) {
  for (const sql of migrations.slice(from)) await db.exec(sql);
}

export async function asAdmin(db) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}

/** Runs the following queries as a signed-in user, with row-level security applied. */
export async function asUser(db, id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
}

/** Creates a login (as Supabase Auth would) and returns its id. */
export async function signUp(db, email, { name } = {}) {
  await asAdmin(db);
  const { rows } = await db.query('insert into auth.users (email) values ($1) returning id', [email]);
  const id = rows[0].id;
  if (name) await db.query('update public.profiles set display_name = $1 where id = $2', [name, id]);
  return id;
}

/** YYYY-MM-DD for "today" in a timezone, optionally shifted by whole days. */
export function localDate(timeZone = 'America/Los_Angeles', offsetDays = 0) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return shifted.toISOString().slice(0, 10);
}
