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
  asyncRoute(async (_req, res) => {
    const groups = await prisma.habitGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(groups);
  }),
);

groupsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = groupBody.parse(req.body);
    const group = await prisma.habitGroup.create({ data: body });
    res.status(201).json(group);
  }),
);

groupsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = groupBody.partial().parse(req.body);
    const group = await prisma.habitGroup.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json(group);
  }),
);

groupsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await prisma.habitGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
