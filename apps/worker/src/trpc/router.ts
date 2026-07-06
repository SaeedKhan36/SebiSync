import { router } from "./trpc";
import { documentRouter } from "./routers/document";
import { obligationRouter } from "./routers/obligation";
import { checklistRouter } from "./routers/checklist";
import { evidenceRouter } from "./routers/evidence";
import { gapRouter } from "./routers/gap";
import { dashboardRouter } from "./routers/dashboard";
import { clientRouter } from "./routers/client";
import { auditRouter } from "./routers/audit";
import { intermediaryRouter } from "./routers/intermediary";

export const appRouter = router({
  document: documentRouter,
  obligation: obligationRouter,
  checklist: checklistRouter,
  evidence: evidenceRouter,
  gap: gapRouter,
  dashboard: dashboardRouter,
  client: clientRouter,
  audit: auditRouter,
  intermediary: intermediaryRouter,
});

export type AppRouter = typeof appRouter;
