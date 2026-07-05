import { router } from "./trpc";
import { documentRouter } from "./routers/document";
import { obligationRouter } from "./routers/obligation";
import { checklistRouter } from "./routers/checklist";
import { evidenceRouter } from "./routers/evidence";
import { gapRouter } from "./routers/gap";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  document: documentRouter,
  obligation: obligationRouter,
  checklist: checklistRouter,
  evidence: evidenceRouter,
  gap: gapRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
