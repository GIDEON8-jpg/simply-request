
-- Add is_locked column to department_budgets
ALTER TABLE public.department_budgets 
ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
