-- Create enums
CREATE TYPE public.app_role AS ENUM ('hod', 'ceo', 'finance', 'accountant', 'technical_director', 'hr');
CREATE TYPE public.department_type AS ENUM ('Education', 'IT', 'Marketing and PR', 'Technical', 'HR', 'Finance', 'CEO');
CREATE TYPE public.currency_type AS ENUM ('USD', 'ZWG', 'GBP', 'EUR');
CREATE TYPE public.requisition_status AS ENUM ('pending', 'approved', 'approved_wait', 'completed', 'rejected');
CREATE TYPE public.requisition_type AS ENUM ('standard', 'deviation');
CREATE TYPE public.supplier_status AS ENUM ('active', 'inactive');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  department public.department_type NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icaz_number TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  status public.supplier_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create tax_clearances table
CREATE TABLE public.tax_clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  quarter TEXT NOT NULL,
  year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tax_clearances ENABLE ROW LEVEL SECURITY;

-- Create requisitions table
CREATE TABLE public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department public.department_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency public.currency_type NOT NULL,
  usd_convertible DECIMAL(12, 2),
  chosen_supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  other_supplier_1_id UUID REFERENCES public.suppliers(id),
  other_supplier_2_id UUID REFERENCES public.suppliers(id),
  chosen_requisition TEXT NOT NULL,
  type public.requisition_type DEFAULT 'standard' NOT NULL,
  deviation_reason TEXT,
  budget_code TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.requisition_status DEFAULT 'pending' NOT NULL,
  submitted_by UUID REFERENCES public.profiles(id) NOT NULL,
  submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tax_clearance_id UUID REFERENCES public.tax_clearances(id),
  approver_comments TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

-- Create requisition_documents table
CREATE TABLE public.requisition_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.requisition_documents ENABLE ROW LEVEL SECURITY;

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  pop_file_name TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_by UUID REFERENCES public.profiles(id) NOT NULL,
  status public.payment_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create department_budgets table
CREATE TABLE public.department_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department public.department_type NOT NULL UNIQUE,
  total_budget DECIMAL(12, 2) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.department_budgets ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for department_budgets updated_at
CREATE TRIGGER update_department_budgets_updated_at
  BEFORE UPDATE ON public.department_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ceo'));

-- RLS Policies for suppliers
CREATE POLICY "Anyone can view active suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Finance and admins can manage suppliers"
  ON public.suppliers FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'finance') OR 
    public.has_role(auth.uid(), 'ceo')
  );

-- RLS Policies for tax_clearances
CREATE POLICY "Anyone can view tax clearances"
  ON public.tax_clearances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage tax clearances"
  ON public.tax_clearances FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

-- RLS Policies for requisitions
CREATE POLICY "Users can view requisitions in their department"
  ON public.requisitions FOR SELECT
  TO authenticated
  USING (
    department = (SELECT department FROM public.profiles WHERE id = auth.uid()) OR
    public.has_role(auth.uid(), 'finance') OR
    public.has_role(auth.uid(), 'ceo') OR
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'technical_director')
  );

CREATE POLICY "HODs can create requisitions for their department"
  ON public.requisitions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hod') AND
    department = (SELECT department FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Approvers can update requisitions"
  ON public.requisitions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ceo') OR
    public.has_role(auth.uid(), 'finance') OR
    public.has_role(auth.uid(), 'technical_director')
  );

-- RLS Policies for requisition_documents
CREATE POLICY "Users can view documents for accessible requisitions"
  ON public.requisition_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r
      WHERE r.id = requisition_id AND (
        r.department = (SELECT department FROM public.profiles WHERE id = auth.uid()) OR
        public.has_role(auth.uid(), 'finance') OR
        public.has_role(auth.uid(), 'ceo')
      )
    )
  );

CREATE POLICY "HODs can upload documents"
  ON public.requisition_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hod')
  );

-- RLS Policies for payments
CREATE POLICY "Finance and accountants can view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'finance') OR
    public.has_role(auth.uid(), 'accountant')
  );

CREATE POLICY "Accountants can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'));

-- RLS Policies for department_budgets
CREATE POLICY "Everyone can view budgets"
  ON public.department_budgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only CEO can manage budgets"
  ON public.department_budgets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ceo'));