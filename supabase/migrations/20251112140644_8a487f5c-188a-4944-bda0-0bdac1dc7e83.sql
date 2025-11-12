-- Ensure fiscal_year has a sensible default (current year)
ALTER TABLE public.department_budgets
  ALTER COLUMN fiscal_year SET DEFAULT EXTRACT(YEAR FROM now())::int;

-- Deduplicate any existing rows for the same (department, fiscal_year) keeping the latest
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY department, fiscal_year
           ORDER BY created_at DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.department_budgets
)
DELETE FROM public.department_budgets
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Create a unique index so UPSERT can target (department, fiscal_year)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_department_budgets_dept_year
  ON public.department_budgets(department, fiscal_year);

-- Enable realtime with full row data for proper UI sync
ALTER TABLE public.department_budgets REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.department_budgets;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END;
$$;