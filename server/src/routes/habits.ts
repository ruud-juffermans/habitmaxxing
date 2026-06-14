import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const habitsRouter = Router();

const habitTypes = ['boolean', 'integer', 'decimal', 'score', 'time', 'duration', 'text'] as const;
const scheduleKinds = ['daily', 'weekdays', 'weekly_count', 'interval'] as const;
const goalDirections = ['at_least', 'at_most'] as const;
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const habitBase = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  type: z.enum(habitTypes),
  unit: z.string().max(20).nullish(),
  min: z.number().nullish(),
  max: z.number().nullish(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
  groupId: z.string().uuid().nullish(),
  // Scheduling. The sibling fields are validated against scheduleKind below.
  scheduleKind: z.enum(scheduleKinds).optional(),
  scheduleDays: z.array(z.number().int().min(1).max(7)).optional(),
  scheduleTarget: z.number().int().min(1).max(7).nullish(),
  scheduleEvery: z.number().int().min(1).max(365).nullish(),
  scheduleAnchor: dateStr.nullish(),
  // Goal: numeric target that defines "done". Only meaningful for numeric types;
  // null clears the goal (any logged value counts). Direction defaults server-side.
  goalTarget: z.number().nullish(),
  goalDirection: z.enum(goalDirections).optional(),
});

// Each schedule kind requires its own fields; flag missing/invalid combos.
function refineSchedule(b: z.infer<typeof habitBase> | Partial<z.infer<typeof habitBase>>, ctx: z.RefinementCtx) {
  if (b.scheduleKind === 'weekdays' && (!b.scheduleDays || b.scheduleDays.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduleDays'], message: 'pick at least one weekday' });
  }
  if (b.scheduleKind === 'weekly_count' && b.scheduleTarget == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduleTarget'], message: 'weekly target is required' });
  }
  if (b.scheduleKind === 'interval') {
    if (b.scheduleEvery == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduleEvery'], message: 'interval (days) is required' });
    }
    if (!b.scheduleAnchor) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduleAnchor'], message: 'anchor date is required' });
    }
  }
}

const createBody = habitBase.superRefine(refineSchedule);
const patchBody = habitBase.partial().superRefine(refineSchedule);

type HabitBody = z.infer<typeof habitBase>;

// Translate the validated schedule fields into a Prisma data patch. Only emitted
// when scheduleKind is present; irrelevant sibling fields are reset to their
// empty value so switching kinds never leaves stale data behind.
function scheduleData(b: Partial<HabitBody>) {
  if (b.scheduleKind === undefined) return {};
  const kind = b.scheduleKind;
  return {
    scheduleKind: kind,
    scheduleDays: kind === 'weekdays' ? b.scheduleDays ?? [] : [],
    scheduleTarget: kind === 'weekly_count' ? b.scheduleTarget ?? null : null,
    scheduleEvery: kind === 'interval' ? b.scheduleEvery ?? null : null,
    scheduleAnchor:
      kind === 'interval' && b.scheduleAnchor ? new Date(`${b.scheduleAnchor}T00:00:00.000Z`) : null,
  };
}

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
    const body = createBody.parse(req.body);
    // Guard against attaching to another user's group.
    if (body.groupId) {
      const group = await prisma.habitGroup.findFirst({
        where: { id: body.groupId, userId: req.user!.id },
        select: { id: true },
      });
      if (!group) return res.status(400).json({ error: 'Unknown group' });
    }
    const { scheduleKind, scheduleDays, scheduleTarget, scheduleEvery, scheduleAnchor, ...rest } = body;
    const habit = await prisma.habit.create({
      data: { ...rest, ...scheduleData(body), userId: req.user!.id },
    });
    res.status(201).json(habit);
  }),
);

habitsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = patchBody.parse(req.body);
    if (body.groupId) {
      const group = await prisma.habitGroup.findFirst({
        where: { id: body.groupId, userId: req.user!.id },
        select: { id: true },
      });
      if (!group) return res.status(400).json({ error: 'Unknown group' });
    }
    const { scheduleKind, scheduleDays, scheduleTarget, scheduleEvery, scheduleAnchor, ...rest } = body;
    const { count } = await prisma.habit.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { ...rest, ...scheduleData(body) },
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
