import { z } from "zod";
import { checklistStatusSchema, gapSeveritySchema, obligationStatusSchema } from "./enums";

export const dashboardSummarySchema = z.object({
  checklistByStatus: z.array(z.object({ status: checklistStatusSchema, count: z.number() })),
  openGapsBySeverity: z.array(z.object({ severity: gapSeveritySchema, count: z.number() })),
  obligationsByStatus: z.array(z.object({ status: obligationStatusSchema, count: z.number() })),
  upcomingDeadlines: z.array(
    z.object({
      id: z.string(),
      dueDate: z.coerce.date(),
      obligationTitle: z.string(),
      clientName: z.string().nullable(),
    }),
  ),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
