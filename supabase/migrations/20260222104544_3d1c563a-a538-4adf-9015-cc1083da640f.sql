
-- Recreate the trigger on auth.users to auto-create profiles and roles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert missing profile for existing user if not exists
INSERT INTO public.profiles (id, full_name, department, email)
SELECT 'ef1867a7-c9a1-4b39-9fdf-0b90c2886a89', 'Gideon Zimano', 'IT', 'gideonz@icaz.org.zw'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'ef1867a7-c9a1-4b39-9fdf-0b90c2886a89');

-- Insert missing role for existing user if not exists
INSERT INTO public.user_roles (user_id, role)
SELECT 'ef1867a7-c9a1-4b39-9fdf-0b90c2886a89', 'preparer'
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'ef1867a7-c9a1-4b39-9fdf-0b90c2886a89');
