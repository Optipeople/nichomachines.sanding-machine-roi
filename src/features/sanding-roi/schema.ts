import { z } from "zod";

export const SubmissionSchema = z.object({
  contact: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(160),
    job: z.string().min(1).max(120),
    company: z.string().max(160).optional(),
  }),
  // Volumes are optional: the funnel can request a proposal from the quick
  // payback (result + hours) without going through the detailed refine step.
  products: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().max(80),
        size: z.string().max(80),
        unitsPerWeek: z.number().min(0).max(1_000_000),
        passes: z.number().int().min(1).max(8),
      }),
    )
    .max(50),
  operatorHoursPerWeek: z.number().min(0).max(10_000),
  availableShifts: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  country: z.string().min(2).max(2),
  material: z.string().min(1).max(20),
  /** Chosen end result (finish goal id) */
  goal: z.string().max(40).optional(),
  selectedSolution: z
    .object({
      name: z.string().min(1).max(160),
      automationOptions: z.array(z.string().min(1).max(160)).max(20),
    })
    .nullable(),
  // honeypot — must be empty
  website: z.string().max(0).optional(),
});

export type Submission = z.infer<typeof SubmissionSchema>;
