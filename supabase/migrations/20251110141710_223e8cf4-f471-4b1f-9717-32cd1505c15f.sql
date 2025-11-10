-- Update RLS to allow Admins to manage department budgets as requested
DROP POLICY IF EXISTS "Only CEO can manage budgets" ON public.department_budgets;

CREATE POLICY "CEO and Admin can manage budgets"
ON public.department_budgets
FOR ALL
USING (
  has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
