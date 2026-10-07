import { z } from 'zod';

const date = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const parsed = new Date(value + 'T12:00:00Z');

    return (
      !isNaN(+parsed) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Choose a valid date');

const time = z.string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const eventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  date,
  start: time,
  end: time,
  location: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(''),
  category: z.enum([
    'Open gym',
    'Group training',
    'Private coaching',
    'Tournament',
    'Closure'
  ]),
  cancelled: z.number().int().min(0).max(1).default(0),
  repeat: z.number().int().min(1).max(12).default(1)
}).refine(
  value => value.end > value.start,
  'End time must be after start time'
);

export const postSchema = z.object({
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(20000),
  date,
  status: z.enum(['draft', 'published']),
  pinned: z.number().int().min(0).max(1).default(0)
});
