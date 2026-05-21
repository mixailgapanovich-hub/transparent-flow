import { Router } from 'express';
import { listTasks, getTaskById } from '../services/taskService.js';

const router = Router();

// GET /api/tasks?projectSlug=proj-eco
router.get('/', async (req, res, next) => {
  try {
    const projectSlug = req.query.projectSlug?.toString() || undefined;
    const tasks = await listTasks({ projectSlug });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

export default router;
