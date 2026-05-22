// Простой раннер миграций: читает api/migrations/*.sql по алфавиту
// и применяет те, которых ещё нет в таблице schema_migrations.
// Флаг --reset дропает всю схему public и накатывает заново.

import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function resetSchema(client) {
  console.log('[migrate] --reset: дропаю схему public и пересоздаю');
  await client.query('DROP SCHEMA public CASCADE');
  await client.query('CREATE SCHEMA public');
  await client.query('GRANT ALL ON SCHEMA public TO public');
}

async function run() {
  const shouldReset = process.argv.includes('--reset');
  const client = await pool.connect();
  try {
    if (shouldReset) {
      await resetSchema(client);
    }
    await ensureMigrationsTable(client);

    const applied = new Set(
      (await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name),
    );

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip ${file} (уже применена)`);
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      console.log(`[migrate] apply ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        appliedCount += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] FAIL ${file}:`, err.message);
        throw err;
      }
    }

    console.log(`[migrate] done. Применено новых миграций: ${appliedCount}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] fatal:', err);
  process.exit(1);
});
