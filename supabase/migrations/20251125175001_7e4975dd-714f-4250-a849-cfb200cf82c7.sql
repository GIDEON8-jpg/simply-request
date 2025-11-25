-- Create a sequence for ICAZ numbers
CREATE SEQUENCE IF NOT EXISTS public.icaz_number_seq START 1;

-- Create a function to generate ICAZ numbers
CREATE OR REPLACE FUNCTION public.generate_icaz_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  icaz_code TEXT;
BEGIN
  -- Get the next sequence value
  next_num := nextval('icaz_number_seq');
  
  -- Format as ICAZ_001, ICAZ_002, etc.
  icaz_code := 'ICAZ_' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN icaz_code;
END;
$$;

-- Create trigger function to auto-populate icaz_number
CREATE OR REPLACE FUNCTION public.set_icaz_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if icaz_number is not provided or is empty
  IF NEW.icaz_number IS NULL OR NEW.icaz_number = '' THEN
    NEW.icaz_number := generate_icaz_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on suppliers table
DROP TRIGGER IF EXISTS trigger_set_icaz_number ON public.suppliers;
CREATE TRIGGER trigger_set_icaz_number
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_icaz_number();

-- Add DELETE policy for HR users
CREATE POLICY "HR can delete suppliers"
  ON public.suppliers
  FOR DELETE
  USING (has_role(auth.uid(), 'hr'::app_role));

-- Add DELETE policy for Finance and CEO
CREATE POLICY "Finance and admins can delete suppliers"
  ON public.suppliers
  FOR DELETE
  USING (has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'ceo'::app_role));