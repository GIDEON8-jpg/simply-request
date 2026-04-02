-- Update Michael Muchena's role to deputy_finance_manager
UPDATE public.user_roles 
SET role = 'deputy_finance_manager' 
WHERE user_id = '45a8ce78-74c9-46af-a600-164aeb799c75' AND role = 'finance_manager';

-- Update requisitions SELECT policy to include deputy_finance_manager
DROP POLICY IF EXISTS "Users can view requisitions" ON public.requisitions;
CREATE POLICY "Users can view requisitions" ON public.requisitions
FOR SELECT TO authenticated
USING (
  (submitted_by = auth.uid()) 
  OR (department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid())) 
  OR has_role(auth.uid(), 'finance_manager'::app_role) 
  OR has_role(auth.uid(), 'deputy_finance_manager'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role) 
  OR has_role(auth.uid(), 'accountant'::app_role) 
  OR has_role(auth.uid(), 'technical_director'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'hr'::app_role)
);

-- Update requisitions UPDATE policy to include deputy_finance_manager
DROP POLICY IF EXISTS "Approvers can update requisitions" ON public.requisitions;
CREATE POLICY "Approvers can update requisitions" ON public.requisitions
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role) 
  OR has_role(auth.uid(), 'ceo'::app_role) 
  OR has_role(auth.uid(), 'finance_manager'::app_role) 
  OR has_role(auth.uid(), 'deputy_finance_manager'::app_role)
  OR has_role(auth.uid(), 'technical_director'::app_role) 
  OR has_role(auth.uid(), 'accountant'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update payments SELECT policy to include deputy_finance_manager
DROP POLICY IF EXISTS "Authorized can view payments" ON public.payments;
CREATE POLICY "Authorized can view payments" ON public.payments
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'accountant'::app_role) 
  OR has_role(auth.uid(), 'finance_manager'::app_role) 
  OR has_role(auth.uid(), 'deputy_finance_manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'ceo'::app_role)
);