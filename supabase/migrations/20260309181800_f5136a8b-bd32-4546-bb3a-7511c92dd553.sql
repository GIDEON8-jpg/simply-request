
-- Drop broken restrictive policies
DROP POLICY IF EXISTS "Everyone can view budgets" ON public.department_budgets;
DROP POLICY IF EXISTS "CEO and Admin can manage budgets" ON public.department_budgets;

-- Create correct PERMISSIVE policies
CREATE POLICY "Everyone can view budgets"
  ON public.department_budgets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CEO and Admin can manage budgets"
  ON public.department_budgets
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
