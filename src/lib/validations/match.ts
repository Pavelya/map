import { z } from 'zod';

export const MatchSchema = z.object({
  teamAName: z.string().min(1).max(100),
  teamAColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  teamALogoUrl: z.string().url().optional(),
  teamBName: z.string().min(1).max(100),
  teamBColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  teamBLogoUrl: z.string().url().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['draft', 'scheduled', 'active', 'ended', 'cancelled']),
  allowPreciseGeo: z.boolean().default(false),
  requireCaptcha: z.boolean().default(true),
  maxVotesPerUser: z.number().int().min(1).max(10).default(1)
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: "End time must be after start time"
});

export const MatchUpdateSchema = z.object({
  teamAName: z.string().min(1).max(100).optional(),
  teamAColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  teamALogoUrl: z.string().url().optional(),
  teamBName: z.string().min(1).max(100).optional(),
  teamBColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  teamBLogoUrl: z.string().url().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'ended', 'cancelled']).optional(),
  allowPreciseGeo: z.boolean().optional(),
  requireCaptcha: z.boolean().optional(),
  maxVotesPerUser: z.number().int().min(1).max(10).optional()
}).refine(data => {
  if (data.startTime && data.endTime) {
    return new Date(data.endTime) > new Date(data.startTime);
  }
  return true;
}, {
  message: "End time must be after start time"
});

export const MatchFiltersSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'active', 'ended', 'cancelled']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional()
});

export type MatchData = z.infer<typeof MatchSchema>;
export type MatchUpdateData = z.infer<typeof MatchUpdateSchema>;
export type MatchFilters = z.infer<typeof MatchFiltersSchema>;