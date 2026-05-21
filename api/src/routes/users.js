import { Router } from 'express';
import { listUsers } from '../services/userService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(await listUsers());
  } catch (err) {
    next(err);
  }
});

export default router;
