-- Step 1: Drop all policies that depend on app_role
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Finance and admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Finance can manage tax clearances" ON public.tax_clearances;
DROP POLICY IF EXISTS "Users can view requisitions in their department" ON public.requisitions;
DROP POLICY IF EXISTS "HODs can create requisitions for their department" ON public.requisitions;
DROP POLICY IF EXISTS "Approvers can update requisitions" ON public.requisitions;
DROP POLICY IF EXISTS "Users can view documents for accessible requisitions" ON public.requisition_documents;
DROP POLICY IF EXISTS "HODs can upload documents" ON public.requisition_documents;
DROP POLICY IF EXISTS "Finance and accountants can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Accountants can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Only CEO can manage budgets" ON public.department_budgets;

-- Step 2: Drop the has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Step 3: Create new enum with updated roles
CREATE TYPE public.app_role_new AS ENUM (
  'preparer',
  'hod', 
  'finance_manager',
  'technical_director',
  'accountant',
  'ceo',
  'admin',
  'hr'
);

-- Step 4: Update user_roles table, converting 'finance' to 'finance_manager'
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new 
  USING (
    CASE 
      WHEN role::text = 'finance' THEN 'finance_manager'::public.app_role_new
      ELSE role::text::public.app_role_new
    END
  );

-- Step 5: Drop the old enum
DROP TYPE public.app_role;

-- Step 6: Rename new enum to app_role
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 7: Recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 8: Recreate all RLS policies with updated roles

-- User Roles policies
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Requisitions policies
CREATE POLICY "Preparers can create requisitions for their department"
ON public.requisitions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'preparer'::app_role) 
  AND department = (SELECT department FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view requisitions in their department"
ON public.requisitions
FOR SELECT
TO authenticated
USING (
  department = (SELECT department FROM profiles WHERE id = auth.uid())
  OR has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'technical_director'::app_role)
  OR has_role(auth.uid(), 'hod'::app_role)
);

CREATE POLICY "Approvers can update requisitions"
ON public.requisitions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'technical_director'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- Requisition Documents policies
CREATE POLICY "Users can view documents for accessible requisitions"
ON public.requisition_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM requisitions r
    WHERE r.id = requisition_documents.requisition_id
    AND (
      r.department = (SELECT department FROM profiles WHERE id = auth.uid())
      OR has_role(auth.uid(), 'finance_manager'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
    )
  )
);

CREATE POLICY "HODs and Preparers can upload documents"
ON public.requisition_documents
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'hod'::app_role) 
  OR has_role(auth.uid(), 'preparer'::app_role)
);

-- Suppliers policies
CREATE POLICY "Finance and admins can manage suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
);

-- Tax Clearances policies
CREATE POLICY "Finance can manage tax clearances"
ON public.tax_clearances
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'finance_manager'::app_role));

-- Payments policies
CREATE POLICY "Finance and accountants can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

CREATE POLICY "Accountants can manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Budget policies
CREATE POLICY "Only CEO can manage budgets"
ON public.department_budgets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ceo'::app_role));

-- Step 9: Update handle_new_user function to default to 'preparer' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, department, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'department')::public.department_type, 'IT'),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'preparer')
  );
  
  RETURN NEW;
END;
$$;