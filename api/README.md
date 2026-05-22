# Transparent Flow — API

Минимальный бэкенд для дипломной системы «Прозрачный поток».
Стек: **Node.js + Express + PostgreSQL** (Этап 2 по дипломной спецификации).

## Быстрый старт

Из корня репозитория:

```bash
# 1. Поднять PostgreSQL в Docker (один раз)
docker compose up -d

# 2. Установить зависимости API
cd api
cp .env.example .env
npm install

# 3. Накатить схему и наполнить тестовыми данными
npm run db:migrate
npm run db:seed

# 4. Запустить сервер (HMR через --watch)
npm run dev
```

После этого:

```bash
curl http://localhost:3001/api/health
# { "ok": true, "db": true, "service": "transparent-flow-api", ... }
```

## Команды

| Команда            | Что делает                                                |
|--------------------|-----------------------------------------------------------|
| `npm run dev`      | Express с авто-перезапуском (`node --watch`)              |
| `npm run start`    | Прод-режим                                                |
| `npm run db:migrate` | Применить новые миграции из `migrations/*.sql`          |
| `npm run db:seed`  | Очистить таблицы и наполнить данными из `src/data/*.js`   |
| `npm run db:reset` | Дроп схемы + миграция + сидер (полный сброс)              |

## Структура

```
api/
├── migrations/          # SQL-миграции по алфавиту
│   └── 001_init.sql
├── scripts/
│   ├── migrate.js       # Раннер миграций (с поддержкой --reset)
│   └── seed.js          # Сидер из фронтовых моков
├── src/
│   ├── db/pool.js       # Пул pg + хелпер withTransaction
│   └── server.js        # Express, /api/health
├── .env.example
└── package.json
```

## Что дальше

Это конец **Итерации 1**. План дальнейших итераций — в `CLAUDE.md` корня и
в обсуждении с PM. Кратко:

- Итерация 2 — read-only `GET /api/projects`, `GET /api/tasks`
- Итерация 3 — мутации задач + FSM-валидация на сервере + аудит
- Итерация 4 — Magic Link + гостевой портал загрузки
- Итерация 5 — JWT-авторизация PM
- Итерация 6 (опц.) — каскадные уведомления, cron
