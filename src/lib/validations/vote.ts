import { z } from 'zod';

export const VoteSubmissionSchema = z.object({
  matchId: z.string().uuid(),
  teamChoice: z.enum(['team_a', 'team_b']),
  fingerprint: z.string().min(1),
  location: z.object({
    h3Index: z.string(),
    h3Resolution: z.number().int().min(0).max(15),
    countryCode: z.string().length(2).optional(),
    cityName: z.string().optional(),
    source: z.enum(['ip', 'browser_geo', 'manual']),
    consentPreciseGeo: z.boolean()
  }),
  captchaToken: z.string().optional(),
  userAgent: z.string()
});

export type VoteSubmissionData = z.infer<typeof VoteSubmissionSchema>;