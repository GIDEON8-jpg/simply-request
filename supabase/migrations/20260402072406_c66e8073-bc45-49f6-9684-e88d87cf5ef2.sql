-- Add deputy_finance_manager to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'deputy_finance_manager';