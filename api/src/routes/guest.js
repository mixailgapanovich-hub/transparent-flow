import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getTaskByToken, applyGuestUpload } from '../services/guestService.js';
import { HttpError } from '../services/taskService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// api/src/routes/ → api/storage/.tmp/
const TMP_DIR = join(__dirname, '..', '..', 'storage', '.tmp');

// Расширения, которые принимаем. Всё, что вне списка — режется ещё до записи на диск.
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.md',
  '.zip', '.7z', '.rar',
  '.mp4', '.mov',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ
const MAX_FILES = 10;

const storage = multer.diskStorage({
  // Создаём .tmp/ при каждом запросе на всякий случай (если кто-то снёс storage/
  // на горячую). mkdir с recursive=true — no-op, если папка уже есть.
  destination: (_req, _file, cb) => {
    mkdir(TMP_DIR, { recursive: true })
      .then(() => cb(null, TMP_DIR))
      .catch(cb);
  },
  filename: (_req, file, cb) => {
    // Защита от path-traversal: храним под uuid+ext, оригинальное имя пойдёт в БД отдельно.
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext || ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      cb(new HttpError(415, `Тип файла ${ext || '(без расширения)'} не разрешён`));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Чтение задачи по токену — для гостевой страницы при открытии ссылки.
router.get('/:token', wrap(async (req, res) => {
  res.json(await getTaskByToken(req.params.token));
}));

// Загрузка файлов клиентом. Поле формы — `files` (multiple).
// Поле формы `comment` — опционально.
router.post('/:token/upload', upload.array('files', MAX_FILES), wrap(async (req, res) => {
  const updated = await applyGuestUpload(
    req.params.token,
    req.files ?? [],
    req.body?.comment ?? '',
  );
  res.status(201).json(updated);
}));

// Локальный handler для ошибок multer (limits, etc.) — нужен до глобального error-middleware,
// чтобы multer-овский MulterError не упал как "Internal Server Error".
router.use((err, _req, res, next) => {
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Файл слишком большой (максимум 50 МБ)'
      : err.code === 'LIMIT_FILE_COUNT'
        ? `Слишком много файлов (максимум ${MAX_FILES})`
        : `Ошибка загрузки: ${err.message}`;
    return res.status(413).json({ error: msg });
  }
  next(err);
});

export default router;
