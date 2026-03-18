
-- Drop and re-add foreign keys on requisitions referencing profiles with CASCADE
ALTER TABLE public.requisitions DROP CONSTRAINT requisitions_submitted_by_fkey;
ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.requisitions DROP CONSTRAINT requisitions_approved_by_fkey;
ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop and re-add foreign keys on audit_logs referencing profiles with CASCADE
ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop and re-add foreign keys on payments referencing profiles with CASCADE
ALTER TABLE public.payments DROP CONSTRAINT payments_processed_by_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop and re-add foreign keys on user_roles referencing profiles with CASCADE
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
