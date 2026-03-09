-- FIX ALL RESTRICTIVE RLS POLICIES ACROSS ALL TABLES

-- 1. DEPARTMENT_BUDGETS
DROP POLICY IF EXISTS "Everyone can view budgets" ON public.department_budgets;
DROP POLICY IF EXISTS "CEO and Admin can manage budgets" ON public.department_budgets;

CREATE POLICY "Everyone can view budgets"
  ON public.department_budgets FOR SELECT TO authenticated USING (true);

CREATE POLICY "CEO and Admin can manage budgets"
  ON public.department_budgets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. REQUISITIONS
DROP POLICY IF EXISTS "Preparers can create requisitions for their department" ON public.requisitions;
DROP POLICY IF EXISTS "Users can view requisitions in their department" ON public.requisitions;
DROP POLICY IF EXISTS "Approvers can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "HODs can create requisitions for their department" ON public.requisitions;
DROP POLICY IF EXISTS "Technical Directors can create requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "CEOs can create requisitions" ON public.requisitions;

CREATE POLICY "Preparers can create requisitions for their department"
  ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'preparer'::app_role) AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "HODs can create requisitions for their department"
  ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'hod'::app_role) AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Technical Directors can create requisitions"
  ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'technical_director'::app_role) AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "CEOs can create requisitions"
  ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ceo'::app_role) AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "HR can create requisitions for their department"
  ON public.requisitions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can view requisitions in their department"
  ON public.requisitions FOR SELECT TO authenticated
  USING (
    department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid())
    OR has_role(auth.uid(), 'finance_manager'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'technical_director'::app_role)
    OR has_role(auth.uid(), 'hod'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
  );

CREATE POLICY "Approvers can update requisitions"
  ON public.requisitions FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'hod'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'finance_manager'::app_role)
    OR has_role(auth.uid(), 'technical_director'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 3. SUPPLIERS
DROP POLICY IF EXISTS "Anyone can view active suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Finance and admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "HR can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "HR can view all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "HR can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Finance and admins can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "HR can update suppliers" ON public.suppliers;

CREATE POLICY "Anyone can view active suppliers"
  ON public.suppliers FOR SELECT TO authenticated USING (status = 'active'::supplier_status);

CREATE POLICY "HR can view all suppliers"
  ON public.suppliers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Finance and admins can manage suppliers"
  ON public.suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "HR can insert suppliers"
  ON public.suppliers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "HR can update suppliers"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'hr'::app_role)) WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "HR can delete suppliers"
  ON public.suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'hr'::app_role));

-- 4. AUDIT_LOGS
DROP POLICY IF EXISTS "Admins and CEOs can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins and CEOs can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 5. PROFILES
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and CEOs can update any profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins and CEOs can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- 6. USER_ROLES
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));

-- 7. PAYMENTS
DROP POLICY IF EXISTS "Accountants can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Finance and accountants can view all payments" ON public.payments;

CREATE POLICY "Accountants can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Finance and accountants can view all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- 8. TAX_CLEARANCES
DROP POLICY IF EXISTS "Anyone can view tax clearances" ON public.tax_clearances;
DROP POLICY IF EXISTS "Finance can manage tax clearances" ON public.tax_clearances;
DROP POLICY IF EXISTS "HR can upload tax clearances" ON public.tax_clearances;

CREATE POLICY "Anyone can view tax clearances"
  ON public.tax_clearances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Finance can manage tax clearances"
  ON public.tax_clearances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'finance_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'finance_manager'::app_role));

CREATE POLICY "HR can upload tax clearances"
  ON public.tax_clearances FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- 9. REQUISITION_DOCUMENTS
DROP POLICY IF EXISTS "HODs and Preparers can upload documents" ON public.requisition_documents;
DROP POLICY IF EXISTS "Users can view documents for accessible requisitions" ON public.requisition_documents;

CREATE POLICY "HODs and Preparers can upload documents"
  ON public.requisition_documents FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'hod'::app_role) OR has_role(auth.uid(), 'preparer'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Users can view documents for accessible requisitions"
  ON public.requisition_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requisitions r
      WHERE r.id = requisition_documents.requisition_id
      AND (
        r.department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid())
        OR has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'ceo'::app_role)
        OR has_role(auth.uid(), 'accountant'::app_role)
        OR has_role(auth.uid(), 'technical_director'::app_role)
        OR has_role(auth.uid(), 'hod'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'hr'::app_role)
      )
    )
  );