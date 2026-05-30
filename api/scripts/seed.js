// Сидер: переносит данные из src/data/*.js (фронтовые моки) в PostgreSQL.
// Идемпотентен: чистит таблицы и наполняет заново.
//
// Строковые ID из моков ('proj-eco', '1', 'pm-1') превращаются в детерминированные
// UUID через namespace v5-подобный алгоритм на SHA-1 — чтобы при повторном
// запуске сидера ссылки между сущностями оставались стабильными.

import 'dotenv/config';
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool, withTransaction } from '../src/db/pool.js';
import { INITIAL_TASKS } from '../../src/data/mockData.js';
import { MOCK_PROJECTS } from '../../src/data/mockProjects.js';

const NAMESPACE = 'transparent-flow.v1';

/** Детерминированный UUID v5-style из произвольной строки. */
function uuidFrom(kind, key) {
  const hash = createHash('sha1').update(`${NAMESPACE}|${kind}|${key}`).digest('hex');
  // Формируем UUID, выставляя версию 5 и variant 10x как в RFC 4122
  const h = hash.slice(0, 32).split('');
  h[12] = '5';
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8).join('')}-${h.slice(8, 12).join('')}-${h
    .slice(12, 16)
    .join('')}-${h.slice(16, 20).join('')}-${h.slice(20, 32).join('')}`;
}

// Демо-пароли. В реальном проекте — переменные окружения, тут — для удобства показа.
const TEAM = [
  { key: 'pm-1', name: 'Adena Admin', email: 'admin@adena.local', role: 'admin', password: 'admin123' },
  { key: 'pm-2', name: 'Nika PM', email: 'pm@adena.local', role: 'pm', password: 'pm123' },
  { key: 'mentor-1', name: 'Ilya Mentor', email: 'mentor@adena.local', role: 'pm', password: 'mentor123' },
];

async function seed() {
  console.log('[seed] стартую');

  await withTransaction(async (c) => {
    // Чистим в правильном порядке (от детей к родителям)
    await c.query(`TRUNCATE TABLE
      task_events, task_comments, task_files, task_assignees, task_dependencies,
      tasks, projects, clients, users
      RESTART IDENTITY CASCADE`);

    // 1) Пользователи (команда) — пароли хэшируем bcrypt-ом (cost=10)
    for (const t of TEAM) {
      const hash = await bcrypt.hash(t.password, 10);
      await c.query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidFrom('user', t.key), t.name, t.email, t.role, hash],
      );
    }
    console.log(`[seed] users: ${TEAM.length}`);

    // 2) Клиенты + проекты (один клиент = один проект, для демо-уровня хватит)
    for (const p of MOCK_PROJECTS) {
      const clientId = uuidFrom('client', p.id);
      await c.query(
        `INSERT INTO clients (id, company_name, contact_name, email)
         VALUES ($1, $2, $3, $4)`,
        [clientId, p.client, `${p.client} — контакт`, `client+${p.id}@example.com`],
      );
      await c.query(
        `INSERT INTO projects (id, slug, client_id, name, status, priority, category, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidFrom('project', p.id),
          p.id,
          clientId,
          p.name,
          p.status,
          p.priority,
          p.category,
          p.deadline,
        ],
      );
    }
    console.log(`[seed] projects: ${MOCK_PROJECTS.length}`);

    // 3) Задачи + связанные сущности
    let depCount = 0;
    let fileCount = 0;
    let commentCount = 0;
    let eventCount = 0;
    let assigneeCount = 0;

    for (const task of INITIAL_TASKS) {
      const taskId = uuidFrom('task', task.id);
      const projectId = uuidFrom('project', task.projectId);

      // Дедлайн может быть в формате 'YYYY-MM-DD' или ISO — TIMESTAMPTZ примет оба
      const deadline = task.deadline ? new Date(task.deadline) : null;

      await c.query(
        `INSERT INTO tasks (id, project_id, title, description, status, tag, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [taskId, projectId, task.title, task.description, task.status, task.tag, deadline],
      );

      // Назначения (берём первого admin'а как PM-владельца)
      for (const a of task.assignees ?? []) {
        const key = a.id; // 'pm-1' / 'pm-2' / 'mentor-1'
        await c.query(
          `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [taskId, uuidFrom('user', key)],
        );
        assigneeCount += 1;
      }

      // Файлы (синтетические из моков, storage_key — заглушка под локальный диск)
      for (const f of task.files ?? []) {
        await c.query(
          `INSERT INTO task_files (task_id, filename, file_size, storage_key, uploaded_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [taskId, f.name, null, `mock/${task.id}/${f.id}`, 'client'],
        );
        fileCount += 1;
      }

      // Комментарии
      for (const cm of task.comments ?? []) {
        await c.query(
          `INSERT INTO task_comments (task_id, author_type, author_name, message, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            taskId,
            cm.author === 'pm' ? 'pm' : 'client',
            cm.name,
            cm.message,
            new Date(cm.at),
          ],
        );
        commentCount += 1;
      }

      // История → task_events (event_type='history')
      for (const h of task.history ?? []) {
        await c.query(
          `INSERT INTO task_events (task_id, actor_type, event_type, payload, created_at)
           VALUES ($1, 'system', 'history', $2::jsonb, $3)`,
          [taskId, JSON.stringify({ text: h.text }), new Date(h.date)],
        );
        eventCount += 1;
      }
    }

    // 3b) Демо-задача в статусе 'waiting' — для немедленного показа каскадных уведомлений
    //     Magic token фиксирован: http://localhost:5173/guest/deadbeef-cafe-babe-feed-000000000001
    {
      const demoTaskId = uuidFrom('task', 'demo-waiting-task');
      const ecoProjectId = uuidFrom('project', 'proj-eco');
      const adminUserId = uuidFrom('user', 'pm-1');
      const demoDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await c.query(
        `INSERT INTO tasks (id, project_id, title, description, status, tag, deadline, magic_link_token, magic_link_expires_at)
         VALUES ($1, $2, $3, $4, 'waiting', 'Ключевая', $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          demoTaskId,
          ecoProjectId,
          '📋 Демо: Тексты для раздела «Услуги»',
          'Клиенту необходимо предоставить финальные тексты для блока «Наши услуги»: описание каждой услуги (3–5 предложений), УТП и призыв к действию.',
          demoDeadline,
          'deadbeef-cafe-babe-feed-000000000001',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ],
      );
      await c.query(
        `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [demoTaskId, adminUserId],
      );
      await c.query(
        `INSERT INTO task_events (task_id, actor_type, actor_id, event_type, payload)
         VALUES ($1, 'system', $2, 'status_change', $3::jsonb)`,
        [demoTaskId, adminUserId, JSON.stringify({ from: 'in-progress', to: 'waiting', text: 'Запрошен контент у клиента' })],
      );
      console.log('[seed] demo waiting task: ok');
    }

    // 4) Зависимости — отдельным проходом, когда все задачи уже в БД
    for (const task of INITIAL_TASKS) {
      for (const depKey of task.dependsOn ?? []) {
        await c.query(
          `INSERT INTO task_dependencies (task_id, depends_on_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [uuidFrom('task', task.id), uuidFrom('task', depKey)],
        );
        depCount += 1;
      }
    }

    console.log(
      `[seed] tasks: ${INITIAL_TASKS.length}, assignees: ${assigneeCount}, ` +
        `files: ${fileCount}, comments: ${commentCount}, events: ${eventCount}, ` +
        `dependencies: ${depCount}`,
    );
  });

  console.log('[seed] готово');
}

seed()
  .catch((err) => {
    console.error('[seed] fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
