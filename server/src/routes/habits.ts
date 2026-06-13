import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const habitsRouter = Router();

const habitTypes = ['boolean', 'integer', 'decimal', 'score', 'time', 'duration', 'text'] as const;

const habitBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  type: z.enum(habitTypes),
  unit: z.string().max(20).nullish(),
  min: z.number().nullish(),
  max: z.number().nullish(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
  groupId: z.string().uuid().nullish(),
});

habitsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const habits = await prisma.habit.findMany({
      where: { userId: req.user!.id, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [
        { group: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    res.json(habits);
  }),
);

habitsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = habitBody.parse(req.body);
    // Guard against attaching to another user's group.
    if (body.groupId) {
      const group = await prisma.habitGroup.findFirst({
        where: { id: body.groupId, userId: req.user!.id },
        select: { id: true },
      });
      if (!group) return res.status(400).json({ error: 'Unknown group' });
    }
    const habit = await prisma.habit.create({ data: { ...body, userId: req.user!.id } });
    res.status(201).json(habit);
  }),
);

habitsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = habitBody.partial().parse(req.body);
    if (body.groupId) {
      const group = await prisma.habitGroup.findFirst({
        where: { id: body.groupId, userId: req.user!.id },
        select: { id: true },
      });
      if (!group) return res.status(400).json({ error: 'Unknown group' });
    }
    const { count } = await prisma.habit.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const habit = await prisma.habit.findUnique({ where: { id: req.params.id } });
    res.json(habit);
  }),
);

habitsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.habit.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);
