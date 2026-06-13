import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const groupsRouter = Router();

const groupBody = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().optional(),
});

groupsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const groups = await prisma.habitGroup.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(groups);
  }),
);

groupsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = groupBody.parse(req.body);
    const group = await prisma.habitGroup.create({ data: { ...body, userId: req.user!.id } });
    res.status(201).json(group);
  }),
);

groupsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = groupBody.partial().parse(req.body);
    const { count } = await prisma.habitGroup.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const group = await prisma.habitGroup.findUnique({ where: { id: req.params.id } });
    res.json(group);
  }),
);

groupsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.habitGroup.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);
