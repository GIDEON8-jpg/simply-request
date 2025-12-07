-- Add policy for admins and CEOs to update any profile
CREATE POLICY "Admins and CEOs can update any profile"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'ceo'::app_role)
);