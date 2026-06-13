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
      where: includeArchived ? {} : { archived: false },
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
    const habit = await prisma.habit.create({ data: body });
    res.status(201).json(habit);
  }),
);

habitsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = habitBody.partial().parse(req.body);
    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json(habit);
  }),
);

habitsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await prisma.habit.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
