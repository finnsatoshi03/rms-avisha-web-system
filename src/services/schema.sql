-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.billing_items (
  id bigint NOT NULL,
  billing_statement_id bigint,
  item_type text CHECK (item_type = ANY (ARRAY['RENTAL'::text, 'SERVICE'::text, 'MATERIAL'::text])),
  reference_id bigint,
  amount numeric,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT billing_items_pkey PRIMARY KEY (id),
  CONSTRAINT billing_items_billing_statement_id_fkey FOREIGN KEY (billing_statement_id) REFERENCES public.billing_statements(id)
);
CREATE TABLE public.billing_statements (
  id bigint NOT NULL,
  statement_number text NOT NULL,
  category text CHECK (category = ANY (ARRAY['RENTAL'::text, 'SERVICE'::text])),
  client_id bigint,
  billing_period_start date,
  billing_period_end date,
  previous_balance numeric DEFAULT 0,
  current_charges numeric DEFAULT 0,
  total_payments numeric DEFAULT 0,
  total_due numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  due_date timestamp without time zone,
  status text,
  branch_id integer,
  CONSTRAINT billing_statements_pkey PRIMARY KEY (id),
  CONSTRAINT billing_statements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT billing_statements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.branches (
  id integer NOT NULL DEFAULT nextval('branches_id_seq'::regclass),
  location character varying NOT NULL,
  CONSTRAINT branches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying,
  contact_number character varying,
  email character varying,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expenses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  bill_name text,
  amount real,
  branch_id integer,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.joborders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  brand_model character varying,
  serial_number character varying,
  machine_type character varying,
  problem_statement text,
  additional_comments text,
  labor_description text,
  rate text,
  amount real,
  labor_total real,
  accessories text,
  material_total real,
  sub_total real,
  grand_total real,
  date_of_approval date,
  date_released date,
  client_id bigint,
  technician_id uuid,
  branch_id integer,
  order_no text UNIQUE,
  status text,
  warranty text,
  warranty_months integer,
  is_copy boolean,
  discount real,
  net_sales real,
  materials_expense real,
  technical_report text,
  order_received uuid,
  completed_at timestamp with time zone,
  downpayment real,
  payment_details jsonb,
  CONSTRAINT joborders_pkey PRIMARY KEY (id),
  CONSTRAINT JobOrder_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT joborders_order_received_fkey FOREIGN KEY (order_received) REFERENCES public.users(id),
  CONSTRAINT joborders_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.users(id),
  CONSTRAINT joborders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.material_stocks (
  id integer NOT NULL DEFAULT nextval('material_stocks_id_seq'::regclass),
  material_name character varying NOT NULL,
  brand character varying NOT NULL,
  price numeric NOT NULL,
  stocks integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  last_stocks_added timestamp with time zone,
  sku character varying,
  category text,
  deleted boolean DEFAULT false,
  branch_id integer,
  cost real,
  CONSTRAINT material_stocks_pkey PRIMARY KEY (id),
  CONSTRAINT material_stocks_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.materials (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  material_description text,
  quantity integer,
  unit_price real,
  total_amount real,
  job_order_id bigint,
  material_id integer,
  used boolean,
  CONSTRAINT materials_pkey PRIMARY KEY (id),
  CONSTRAINT materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.material_stocks(id),
  CONSTRAINT materials_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.joborders(id)
);
CREATE TABLE public.payment_records (
  id bigint NOT NULL,
  billing_statement_id bigint,
  amount numeric,
  payment_date timestamp without time zone,
  payment_method text,
  reference_number text,
  status text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payment_records_pkey PRIMARY KEY (id),
  CONSTRAINT payment_records_billing_statement_id_fkey FOREIGN KEY (billing_statement_id) REFERENCES public.billing_statements(id)
);
CREATE TABLE public.rentals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint,
  unit_id integer,
  start_date date,
  end_date date,
  rate_amount numeric,
  rental_type text CHECK (rental_type = ANY (ARRAY['DAILY'::text, 'MONTHLY'::text])),
  status text,
  payment_terms jsonb,
  created_at timestamp without time zone DEFAULT now(),
  branch_id integer,
  grand_total real,
  CONSTRAINT rentals_pkey PRIMARY KEY (id),
  CONSTRAINT rentals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT rentals_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT rentals_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.units (
  id integer NOT NULL DEFAULT nextval('units_id_seq'::regclass),
  unit_name text NOT NULL,
  model text,
  serial_number text,
  daily_rate numeric,
  monthly_rate numeric,
  status text,
  branch_id integer,
  created_at timestamp without time zone,
  is_available boolean DEFAULT true,
  updated_at timestamp without time zone,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text,
  role text,
  avatar text,
  fullname text,
  deleted boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
-- Changelog table for dynamic changelog management
CREATE TABLE IF NOT EXISTS changelogs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  version VARCHAR(50) NOT NULL,
  release_date DATE NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  roles JSONB NOT NULL DEFAULT '[]', -- Array of roles that should see this changelog
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_changelogs_roles ON changelogs USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_changelogs_active ON changelogs (is_active);
CREATE INDEX IF NOT EXISTS idx_changelogs_release_date ON changelogs (release_date DESC);

CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  quote_no TEXT UNIQUE NOT NULL,
  job_order_id BIGINT NOT NULL,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date DATE,
  company TEXT,
  address TEXT,
  note TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  labor_rate NUMERIC DEFAULT 0,
  total_quote NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT quotations_pkey PRIMARY KEY (id),
  CONSTRAINT quotations_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.joborders(id) ON DELETE CASCADE
);

-- If the table exists but has old columns, drop them
ALTER TABLE quotations DROP COLUMN IF EXISTS client_name;
ALTER TABLE quotations DROP COLUMN IF EXISTS contact;
ALTER TABLE quotations DROP COLUMN IF EXISTS brand;
ALTER TABLE quotations DROP COLUMN IF EXISTS model;
ALTER TABLE quotations DROP COLUMN IF EXISTS serial_number;
ALTER TABLE quotations DROP COLUMN IF EXISTS problem;

-- Ensure the job_order_id column exists and is properly typed
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS job_order_id BIGINT;

-- Add the foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotations_job_order_id_fkey'
    ) THEN
        ALTER TABLE quotations 
        ADD CONSTRAINT quotations_job_order_id_fkey 
        FOREIGN KEY (job_order_id) REFERENCES public.joborders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create quotation_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS quotation_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  quotation_id BIGINT NOT NULL,
  description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  material_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT quotation_items_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE
);

-- Add quotation status and active flag to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('approved'));
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT true;

-- Create index for better performance on quotation queries
CREATE INDEX IF NOT EXISTS idx_quotations_job_order_id ON quotations (job_order_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations (status);
CREATE INDEX IF NOT EXISTS idx_quotations_is_active ON quotations (is_active);
CREATE INDEX IF NOT EXISTS idx_quotations_is_final ON quotations (is_final);

-- Add material_id column to existing quotation_items table if it doesn't exist
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS material_id TEXT;

-- Add labor_rate column to existing quotations table if it doesn't exist
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS labor_rate NUMERIC DEFAULT 0;

-- Note: material_id is stored as TEXT to match frontend expectations
-- Foreign key constraint is not added due to type mismatch (TEXT vs INTEGER)
-- The relationship is maintained at the application level

-- Create sequence for quote numbers
CREATE SEQUENCE IF NOT EXISTS quote_no_seq START 1;

-- Create function to generate sequential quote numbers
CREATE OR REPLACE FUNCTION generate_quote_no()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  padded_no TEXT;
BEGIN
  -- Get next value from sequence
  next_val := nextval('quote_no_seq');
  
  -- Pad with zeros to 5 digits
  padded_no := LPAD(next_val::TEXT, 5, '0');
  
  RETURN padded_no;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set quote_no on insert (only if empty)
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-generate if quote_no is empty or null
  IF NEW.quote_no IS NULL OR NEW.quote_no = '' THEN
    NEW.quote_no := generate_quote_no();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quotations table
DROP TRIGGER IF EXISTS trigger_set_quote_number ON quotations;
CREATE TRIGGER trigger_set_quote_number
  BEFORE INSERT ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();