import { Router } from 'express';
import { getTaskByToken, applyGuestUpload } from '../services/guestService.js';
import { makeUploader, MAX_FILES, multerErrorHandler } from '../middleware/uploads.js';

const router = Router();
const upload = makeUploader();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Чтение задачи по токену — для гостевой страницы при открытии ссылки.
router.get('/:token', wrap(async (req, res) => {
  res.json(await getTaskByToken(req.params.token));
}));

// Загрузка файлов клиентом. Поле формы — `files` (multiple). `comment` — опционально.
router.post('/:token/upload', upload.array('files', MAX_FILES), wrap(async (req, res) => {
  const updated = await applyGuestUpload(
    req.params.token,
    req.files ?? [],
    req.body?.comment ?? '',
  );
  res.status(201).json(updated);
}));

// Локальный handler для ошибок multer (limits) — до глобального error-middleware.
router.use(multerErrorHandler);

export default router;
