-- Additive: existing COMPLIANT rows are untouched. The maker-checker gate
-- applies going forward (evidence upload → PENDING_REVIEW → admin approve).
ALTER TYPE "ChecklistStatus" ADD VALUE 'PENDING_REVIEW' AFTER 'IN_PROGRESS';
