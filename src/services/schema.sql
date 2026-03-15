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
CREATE TABLE public.changelogs (
  id integer NOT NULL DEFAULT nextval('changelogs_id_seq'::regclass),
  title character varying NOT NULL,
  description text NOT NULL,
  version character varying NOT NULL,
  release_date date NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT changelogs_pkey PRIMARY KEY (id)
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
  is_copy boolean,
  discount real,
  net_sales real,
  materials_expense real,
  technical_report text,
  order_received uuid,
  completed_at timestamp with time zone,
  downpayment real,
  payment_details jsonb,
  warranty_months integer,
  is_manual_rate boolean DEFAULT false,
  include_quotation_items boolean DEFAULT false,
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
CREATE TABLE public.quotation_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  quotation_id bigint NOT NULL,
  description text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  material_id text,
  is_manual boolean DEFAULT false,
  CONSTRAINT quotation_items_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id)
);
CREATE TABLE public.quotations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  quote_no text NOT NULL UNIQUE,
  job_order_id bigint NOT NULL,
  date_created timestamp with time zone DEFAULT now(),
  end_date date,
  company text,
  address text,
  note text,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total_quote numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  labor_rate numeric DEFAULT 0,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'for_approval'::text, 'approved'::text, 'rejected'::text, 'expired'::text])),
  is_active boolean DEFAULT true,
  is_final boolean DEFAULT false,
  service_fee numeric DEFAULT '0'::numeric,
  CONSTRAINT quotations_pkey PRIMARY KEY (id),
  CONSTRAINT quotations_job_order_id_fkey FOREIGN KEY (job_order_id) REFERENCES public.joborders(id)
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
  branch_id integer,
  shared_manager boolean DEFAULT false,
  deleted boolean DEFAULT false,
  must_change_password boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_branch_id_check CHECK (((branch_id IS NULL) OR (branch_id = ANY (ARRAY[1, 2])))),
  CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['dev'::text, 'admin'::text, 'manager'::text, 'technician'::text]))),
  CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
