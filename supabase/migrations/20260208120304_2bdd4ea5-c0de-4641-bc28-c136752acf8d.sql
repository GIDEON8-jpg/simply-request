
-- Create new supplier_category enum
CREATE TYPE public.supplier_category AS ENUM (
  'Advertising and Promo',
  'Building, electricians etc',
  'Car hire & Air travel',
  'Catering, Study and Graduation',
  'Fumigators, Cleaners',
  'Furniture & Repairs',
  'HR & Legal',
  'Hotels, Travel and Events',
  'Insurance',
  'Office Consumables',
  'Stationery & Printing',
  'Tech Services',
  'Telecomms',
  'Uniforms'
);

-- Replace the department column with category column on suppliers table
ALTER TABLE public.suppliers DROP COLUMN department;
ALTER TABLE public.suppliers ADD COLUMN category public.supplier_category NOT NULL DEFAULT 'Tech Services';
