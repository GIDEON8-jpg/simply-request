
-- Drop ALL existing policies and recreate as PERMISSIVE

-- department_budgets
DROP POLICY IF EXISTS "Everyone can view budgets" ON public.department_budgets;
DROP POLICY IF EXISTS "CEO and Admin can manage budgets" ON public.department_budgets;

CREATE POLICY "Everyone can view budgets" ON public.department_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "CEO and Admin can manage budgets" ON public.department_budgets FOR ALL TO authenticated USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- suppliers
DROP POLICY IF EXISTS "Authenticated can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "HR can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin can manage suppliers" ON public.suppliers;

CREATE POLICY "Authenticated can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (has_role(auth.uid(), 'hr'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Admin can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- audit_logs
DROP POLICY IF EXISTS "Admins and CEOs can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins and CEOs can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- tax_clearances
DROP POLICY IF EXISTS "Anyone can view tax clearances" ON public.tax_clearances;
DROP POLICY IF EXISTS "Finance can manage tax clearances" ON public.tax_clearances;
DROP POLICY IF EXISTS "HR can upload tax clearances" ON public.tax_clearances;

CREATE POLICY "Anyone can view tax clearances" ON public.tax_clearances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance can manage tax clearances" ON public.tax_clearances FOR ALL TO authenticated USING (has_role(auth.uid(), 'finance_manager'::app_role)) WITH CHECK (has_role(auth.uid(), 'finance_manager'::app_role));
CREATE POLICY "HR can upload tax clearances" ON public.tax_clearances FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- payments
DROP POLICY IF EXISTS "Authorized can view payments" ON public.payments;
DROP POLICY IF EXISTS "Accountants can manage payments" ON public.payments;

CREATE POLICY "Authorized can view payments" ON public.payments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "Accountants can manage payments" ON public.payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'accountant'::app_role)) WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

-- requisitions
DROP POLICY IF EXISTS "Users can view requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Authenticated users can create requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Approvers can update requisitions" ON public.requisitions;

CREATE POLICY "Users can view requisitions" ON public.requisitions FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()) OR has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'technical_director'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Authenticated users can create requisitions" ON public.requisitions FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid() AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Approvers can update requisitions" ON public.requisitions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'hod'::app_role) OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'technical_director'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- requisition_documents
DROP POLICY IF EXISTS "Users can view documents" ON public.requisition_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.requisition_documents;

CREATE POLICY "Users can view documents" ON public.requisition_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upload documents" ON public.requisition_documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'hod'::app_role) OR has_role(auth.uid(), 'preparer'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));
