-- CreateEnum
CREATE TYPE "material_categories" AS ENUM ('FEED', 'MEDICINE', 'VACCINE', 'EQUIPMENT', 'CHEMICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "warehouse_types" AS ENUM ('MATERIAL', 'HARVEST', 'PRODUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "sick_group_status" AS ENUM ('TREATING', 'FINISHED');

-- CreateEnum
CREATE TYPE "pig_status" AS ENUM ('SICK', 'RECOVERED', 'DEAD');

-- CreateTable
CREATE TABLE "assignment_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "assignment_id" UUID DEFAULT gen_random_uuid(),
    "employee_id" UUID DEFAULT gen_random_uuid(),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "task_description" TEXT DEFAULT '',
    "shift_id" UUID DEFAULT gen_random_uuid(),
    "notes" TEXT,
    "status" TEXT DEFAULT 'pending',
    "task_type" TEXT DEFAULT 'other',
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "assignment_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "assignment_date" DATE,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemicals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "cleaning_schedule_id" UUID DEFAULT gen_random_uuid(),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "employee_id" UUID DEFAULT gen_random_uuid(),
    "method_id" UUID DEFAULT gen_random_uuid(),
    "chemical_id" UUID DEFAULT gen_random_uuid(),
    "status" TEXT DEFAULT '',

    CONSTRAINT "cleaning_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "cleaning_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "cleaning_date" DATE,

    CONSTRAINT "cleaning_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "role" TEXT DEFAULT '',

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_log_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "log_id" UUID DEFAULT gen_random_uuid(),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "average_temperature" REAL,
    "average_humidity" REAL,
    "ventilation_status" TEXT,
    "average_water" REAL,
    "inspector_id" UUID DEFAULT gen_random_uuid(),
    "warning" TEXT,

    CONSTRAINT "environment_log_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),

    CONSTRAINT "environment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "category_id" UUID DEFAULT gen_random_uuid(),
    "amount" DECIMAL,
    "payment_status" TEXT DEFAULT '',
    "cost_entity_id" UUID DEFAULT gen_random_uuid(),

    CONSTRAINT "expenses_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeding_schedule_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "feeding_schedule_id" UUID DEFAULT gen_random_uuid(),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "feeding_time" TIMETZ(6) DEFAULT CURRENT_TIMESTAMP,
    "feed_id" UUID DEFAULT gen_random_uuid(),
    "feed_amount" REAL DEFAULT 0,

    CONSTRAINT "feeding_schedule_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeding_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "feeding_date" DATE,

    CONSTRAINT "feeding_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "herd_report_pen_pigs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pig_id" UUID DEFAULT gen_random_uuid(),
    "weight" REAL DEFAULT 0,
    "status_id" UUID DEFAULT gen_random_uuid(),

    CONSTRAINT "herd_report_pen_pigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "herd_report_pens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "healthy_count" INTEGER DEFAULT 0,
    "sick_count" INTEGER DEFAULT 0,
    "dead_count" INTEGER DEFAULT 0,
    "shipped_count" INTEGER DEFAULT 0,
    "herd_report_id" UUID,

    CONSTRAINT "herd_report_pens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "herd_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),

    CONSTRAINT "herd_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pen_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pen_type_name" TEXT DEFAULT '',

    CONSTRAINT "pen_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pen_name" TEXT DEFAULT '',
    "pen_type_id" UUID DEFAULT gen_random_uuid(),

    CONSTRAINT "pens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_batchs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "pig_breed_id" UUID DEFAULT gen_random_uuid(),

    CONSTRAINT "pig_batchs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_breeds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "breed_name" TEXT DEFAULT '',

    CONSTRAINT "pigBreed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_shipping_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pig_shipping_id" UUID DEFAULT gen_random_uuid(),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "quantity" INTEGER DEFAULT 0,
    "total_weight" REAL DEFAULT 0,
    "price_unit" DECIMAL DEFAULT 0,
    "amount" DECIMAL DEFAULT 0,
    "status_id" UUID DEFAULT gen_random_uuid(),
    "payment_method" TEXT DEFAULT '',

    CONSTRAINT "pig_shipping_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_shipping_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "shipping_pig_form_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_shippings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "customer_name" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "phone_number" TEXT DEFAULT '',
    "total_amount" DECIMAL DEFAULT 0,

    CONSTRAINT "pig_shippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "status_name" TEXT DEFAULT '',

    CONSTRAINT "pig_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pig_id" UUID DEFAULT gen_random_uuid(),
    "old_pen_id" UUID DEFAULT gen_random_uuid(),
    "new_pen_id" UUID DEFAULT gen_random_uuid(),

    CONSTRAINT "pig_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pigs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pig_batch_id" UUID DEFAULT gen_random_uuid(),
    "weight" REAL DEFAULT 0,
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "pig_status_id" UUID DEFAULT gen_random_uuid(),
    "ear_tag_number" TEXT DEFAULT '',

    CONSTRAINT "pig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rearing_pens" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pen_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quantity" INTEGER DEFAULT 0,

    CONSTRAINT "rearing_pens_pkey" PRIMARY KEY ("pen_id","batch_id")
);

-- CreateTable
CREATE TABLE "treatment_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "treatment_id" UUID DEFAULT gen_random_uuid(),
    "medicine" TEXT DEFAULT '',
    "dosage" REAL DEFAULT 0,
    "condition" TEXT DEFAULT '',

    CONSTRAINT "treatment_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_schedule_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "schedule_id" UUID DEFAULT gen_random_uuid(),
    "dosage" REAL DEFAULT 0,
    "stage" INTEGER DEFAULT 1,

    CONSTRAINT "vaccination_schedule_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pen_id" UUID DEFAULT gen_random_uuid(),
    "employee_id" UUID DEFAULT gen_random_uuid(),

    CONSTRAINT "vaccination_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_report_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "vaccine_id" UUID DEFAULT gen_random_uuid(),
    "disease_id" UUID DEFAULT gen_random_uuid(),
    "cost" DECIMAL DEFAULT 0,
    "total_vaccinated" INTEGER DEFAULT 0,
    "post_vaccination_status" TEXT DEFAULT '',
    "effectiveness_rate" REAL DEFAULT 0,
    "vaccine_report_id" UUID,

    CONSTRAINT "vaccine_report_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),

    CONSTRAINT "vaccine_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "vaccine_name" TEXT DEFAULT '',

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "session" TEXT DEFAULT '',
    "start_time" TIMETZ(6) DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMETZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "expense_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "warehouse_type" VARCHAR(50) NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "account_type" VARCHAR(50) DEFAULT 'cash',
    "account_number" VARCHAR(100),
    "bank_name" VARCHAR(255),
    "opening_balance" DECIMAL(18,2) DEFAULT 0,
    "current_balance" DECIMAL(18,2) DEFAULT 0,
    "description" TEXT,
    "is_default" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "tax_code" VARCHAR(50),
    "total_receivable" DECIMAL(18,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_cash_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cash_account_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "opening_balance" DECIMAL(18,2) DEFAULT 0,
    "total_income" DECIMAL(18,2) DEFAULT 0,
    "total_expense" DECIMAL(18,2) DEFAULT 0,
    "closing_balance" DECIMAL(18,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_cash_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_inventory_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "opening_quantity" DECIMAL(15,3) DEFAULT 0,
    "received_quantity" DECIMAL(15,3) DEFAULT 0,
    "issued_quantity" DECIMAL(15,3) DEFAULT 0,
    "closing_quantity" DECIMAL(15,3) DEFAULT 0,
    "avg_cost" DECIMAL(18,2) DEFAULT 0,
    "total_value" DECIMAL(18,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_inventory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) DEFAULT 'staff',
    "joined_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,3) DEFAULT 0,
    "avg_cost" DECIMAL(18,2) DEFAULT 0,
    "last_updated" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "inventory_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "receipt_item_id" UUID,
    "batch_number" VARCHAR(100),
    "quantity" DECIMAL(15,3) DEFAULT 0,
    "initial_quantity" DECIMAL(15,3) DEFAULT 0,
    "unit_cost" DECIMAL(18,2) DEFAULT 0,
    "manufacturing_date" DATE,
    "expiry_date" DATE,
    "received_date" DATE NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_check_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "check_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "system_quantity" DECIMAL(15,3) DEFAULT 0,
    "actual_quantity" DECIMAL(15,3) DEFAULT 0,
    "difference" DECIMAL(15,3) DEFAULT 0,
    "unit_cost" DECIMAL(18,2) DEFAULT 0,
    "difference_value" DECIMAL(18,2) DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_checks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "warehouse_id" UUID NOT NULL,
    "check_code" VARCHAR(100) NOT NULL,
    "check_date" DATE NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(50) DEFAULT 'draft',
    "created_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "transaction_type" VARCHAR(50) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "quantity_before" DECIMAL(15,3) DEFAULT 0,
    "quantity_change" DECIMAL(15,3) NOT NULL,
    "quantity_after" DECIMAL(15,3) DEFAULT 0,
    "unit_cost" DECIMAL(18,2) DEFAULT 0,
    "total_cost" DECIMAL(18,2) DEFAULT 0,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_bill_records" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bill_id" UUID NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "due_date" DATE,
    "paid_date" DATE,
    "transaction_id" UUID,
    "status" VARCHAR(50) DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_bill_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_bills" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "default_amount" DECIMAL(18,2) DEFAULT 0,
    "due_day" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category_id" UUID,
    "code" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "unit_id" UUID,
    "min_quantity" DECIMAL(15,3) DEFAULT 0,
    "default_price" DECIMAL(18,2) DEFAULT 0,
    "image_url" TEXT,
    "barcode" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_issue_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "issue_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit_cost" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_issues" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "warehouse_id" UUID NOT NULL,
    "issue_code" VARCHAR(100) NOT NULL,
    "issue_date" DATE NOT NULL,
    "issue_type" VARCHAR(50) DEFAULT 'usage',
    "purpose" TEXT,
    "total_amount" DECIMAL(18,2) DEFAULT 0,
    "notes" TEXT,
    "created_by" UUID,
    "approved_by" UUID,
    "status" VARCHAR(50) DEFAULT 'draft',
    "pig_batch_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receipt_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "receipt_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) DEFAULT 0,
    "discount_amount" DECIMAL(18,2) DEFAULT 0,
    "tax_percent" DECIMAL(5,2) DEFAULT 0,
    "tax_amount" DECIMAL(18,2) DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "expiry_date" DATE,
    "batch_number" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_receipts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "warehouse_id" UUID NOT NULL,
    "supplier_id" UUID,
    "receipt_code" VARCHAR(100) NOT NULL,
    "receipt_date" DATE NOT NULL,
    "receipt_type" VARCHAR(50) DEFAULT 'purchase',
    "total_amount" DECIMAL(18,2) DEFAULT 0,
    "discount_amount" DECIMAL(18,2) DEFAULT 0,
    "tax_amount" DECIMAL(18,2) DEFAULT 0,
    "shipping_fee" DECIMAL(18,2) DEFAULT 0,
    "final_amount" DECIMAL(18,2) DEFAULT 0,
    "paid_amount" DECIMAL(18,2) DEFAULT 0,
    "debt_amount" DECIMAL(18,2) DEFAULT 0,
    "payment_status" VARCHAR(50) DEFAULT 'unpaid',
    "notes" TEXT,
    "invoice_number" VARCHAR(100),
    "invoice_date" DATE,
    "created_by" UUID,
    "approved_by" UUID,
    "status" VARCHAR(50) DEFAULT 'draft',
    "is_cost_recorded" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_debts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "supplier_id" UUID NOT NULL,
    "reference_type" VARCHAR(50) NOT NULL,
    "reference_id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "debt_amount" DECIMAL(18,2) DEFAULT 0,
    "payment_amount" DECIMAL(18,2) DEFAULT 0,
    "balance_before" DECIMAL(18,2) DEFAULT 0,
    "balance_after" DECIMAL(18,2) DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "tax_code" VARCHAR(50),
    "bank_account" VARCHAR(100),
    "bank_name" VARCHAR(255),
    "notes" TEXT,
    "total_debt" DECIMAL(18,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "code" VARCHAR(50),
    "description" TEXT,
    "is_system" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cash_account_id" UUID NOT NULL,
    "category_id" UUID,
    "transaction_code" VARCHAR(100) NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "contact_type" VARCHAR(50),
    "contact_id" UUID,
    "contact_name" VARCHAR(255),
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "description" TEXT,
    "notes" TEXT,
    "is_recorded" BOOLEAN DEFAULT true,
    "status" VARCHAR(50) DEFAULT 'confirmed',
    "created_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "abbreviation" VARCHAR(20),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "role" VARCHAR(50) DEFAULT 'staff',
    "avatar_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diseases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "name" TEXT DEFAULT '',

    CONSTRAINT "diseases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_treatments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "barn_id" TEXT,
    "disease_id" UUID,
    "symptom" TEXT DEFAULT '',
    "status" "sick_group_status" NOT NULL DEFAULT 'TREATING',

    CONSTRAINT "disease_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pig_in_treatment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pig_code" TEXT NOT NULL,
    "status" "pig_status" NOT NULL DEFAULT 'SICK',
    "treatment_id" UUID NOT NULL,

    CONSTRAINT "pig_in_treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "date" TIMESTAMP(3) NOT NULL,
    "medicine" TEXT,
    "dosage" TEXT,
    "condition" TEXT,
    "treatment_id" UUID NOT NULL,

    CONSTRAINT "treatment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_cash_snapshots_cash_account_id_snapshot_date_key" ON "daily_cash_snapshots"("cash_account_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_inventory_snapshots_warehouse_id_product_id_snapshot__key" ON "daily_inventory_snapshots"("warehouse_id", "product_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "idx_inventory_warehouse_product" ON "inventory"("warehouse_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_warehouse_id_product_id_key" ON "inventory"("warehouse_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_inventory_batches_inventory" ON "inventory_batches"("inventory_id");

-- CreateIndex
CREATE INDEX "idx_inventory_batches_product" ON "inventory_batches"("product_id");

-- CreateIndex
CREATE INDEX "idx_inventory_batches_status" ON "inventory_batches"("status");

-- CreateIndex
CREATE INDEX "idx_inventory_history_date" ON "inventory_history"("created_at");

-- CreateIndex
CREATE INDEX "idx_inventory_history_product" ON "inventory_history"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_bill_records_bill_id_period_month_period_year_key" ON "monthly_bill_records"("bill_id", "period_month", "period_year");

-- CreateIndex
CREATE INDEX "idx_products_category_id" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "idx_products_code" ON "products"("code");

-- CreateIndex
CREATE INDEX "idx_stock_issues_code" ON "stock_issues"("issue_code");

-- CreateIndex
CREATE INDEX "idx_stock_issues_date" ON "stock_issues"("issue_date");

-- CreateIndex
CREATE INDEX "idx_stock_receipts_code" ON "stock_receipts"("receipt_code");

-- CreateIndex
CREATE INDEX "idx_stock_receipts_date" ON "stock_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "idx_stock_receipts_supplier" ON "stock_receipts"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_supplier_debts_date" ON "supplier_debts"("transaction_date");

-- CreateIndex
CREATE INDEX "idx_supplier_debts_supplier" ON "supplier_debts"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_transactions_category" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "idx_transactions_code" ON "transactions"("transaction_code");

-- CreateIndex
CREATE INDEX "idx_transactions_date" ON "transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "idx_transactions_type" ON "transactions"("transaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "assignment_details" ADD CONSTRAINT "assignment_details_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_details" ADD CONSTRAINT "assignment_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_details" ADD CONSTRAINT "assignment_details_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_details" ADD CONSTRAINT "assignment_details_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_details" ADD CONSTRAINT "cleaning_details_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_details" ADD CONSTRAINT "cleaning_details_cleaning_schedule_id_fkey" FOREIGN KEY ("cleaning_schedule_id") REFERENCES "cleaning_schedules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_details" ADD CONSTRAINT "cleaning_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_details" ADD CONSTRAINT "cleaning_details_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "cleaning_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_details" ADD CONSTRAINT "cleaning_details_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "environment_log_details" ADD CONSTRAINT "environment_log_details_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "environment_log_details" ADD CONSTRAINT "environment_log_details_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "environment_logs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "environment_log_details" ADD CONSTRAINT "environment_log_details_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cost_entity_id_fkey" FOREIGN KEY ("cost_entity_id") REFERENCES "expense_entities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feeding_schedule_details" ADD CONSTRAINT "feeding_schedule_details_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feeding_schedule_details" ADD CONSTRAINT "feeding_schedule_details_feeding_schedule_id_fkey" FOREIGN KEY ("feeding_schedule_id") REFERENCES "feeding_schedules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feeding_schedule_details" ADD CONSTRAINT "feeding_schedule_details_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "herd_report_pen_pigs" ADD CONSTRAINT "herd_report_pen_pigs_pig_id_fkey" FOREIGN KEY ("pig_id") REFERENCES "pigs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "herd_report_pen_pigs" ADD CONSTRAINT "herd_report_pen_pigs_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "pig_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "herd_report_pens" ADD CONSTRAINT "herd_report_pens_herd_report_id_fkey" FOREIGN KEY ("herd_report_id") REFERENCES "herd_reports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "herd_report_pens" ADD CONSTRAINT "herd_report_pens_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pens" ADD CONSTRAINT "pens_pen_type_id_fkey" FOREIGN KEY ("pen_type_id") REFERENCES "pen_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_batchs" ADD CONSTRAINT "pig_batchs_pig_breed_id_fkey" FOREIGN KEY ("pig_breed_id") REFERENCES "pig_breeds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_shipping_details" ADD CONSTRAINT "pig_shipping_details_pig_shipping_id_fkey" FOREIGN KEY ("pig_shipping_id") REFERENCES "pig_shippings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_shipping_details" ADD CONSTRAINT "pig_shipping_details_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "pig_shipping_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_transfers" ADD CONSTRAINT "pig_transfers_new_pen_id_fkey" FOREIGN KEY ("new_pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_transfers" ADD CONSTRAINT "pig_transfers_old_pen_id_fkey" FOREIGN KEY ("old_pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_transfers" ADD CONSTRAINT "pig_transfers_pig_id_fkey" FOREIGN KEY ("pig_id") REFERENCES "pigs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pigs" ADD CONSTRAINT "pig_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pigs" ADD CONSTRAINT "pig_pig_batch_id_fkey" FOREIGN KEY ("pig_batch_id") REFERENCES "pig_batchs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pigs" ADD CONSTRAINT "pig_pig_status_id_fkey" FOREIGN KEY ("pig_status_id") REFERENCES "pig_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rearing_pens" ADD CONSTRAINT "rearing_pens_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "pig_batchs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rearing_pens" ADD CONSTRAINT "rearing_pens_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_details" ADD CONSTRAINT "treatment_details_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "disease_treatments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccination_schedule_details" ADD CONSTRAINT "vaccination_schedule_details_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "vaccination_schedules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccination_schedules" ADD CONSTRAINT "vaccination_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccination_schedules" ADD CONSTRAINT "vaccination_schedules_pen_id_fkey" FOREIGN KEY ("pen_id") REFERENCES "pens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccine_report_details" ADD CONSTRAINT "vaccine_report_details_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccine_report_details" ADD CONSTRAINT "vaccine_report_details_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vaccine_report_details" ADD CONSTRAINT "vaccine_report_details_vaccine_report_id_fkey" FOREIGN KEY ("vaccine_report_id") REFERENCES "vaccine_reports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_cash_snapshots" ADD CONSTRAINT "daily_cash_snapshots_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_inventory_snapshots" ADD CONSTRAINT "daily_inventory_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_inventory_snapshots" ADD CONSTRAINT "daily_inventory_snapshots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_receipt_item_id_fkey" FOREIGN KEY ("receipt_item_id") REFERENCES "stock_receipt_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "inventory_checks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_bill_records" ADD CONSTRAINT "monthly_bill_records_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "monthly_bills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_bill_records" ADD CONSTRAINT "monthly_bill_records_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_bills" ADD CONSTRAINT "monthly_bills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "warehouse_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_issue_items" ADD CONSTRAINT "stock_issue_items_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "stock_issues"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_issue_items" ADD CONSTRAINT "stock_issue_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_issues" ADD CONSTRAINT "stock_issues_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_receipt_items" ADD CONSTRAINT "stock_receipt_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_receipt_items" ADD CONSTRAINT "stock_receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "stock_receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_debts" ADD CONSTRAINT "supplier_debts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "transaction_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "disease_treatments" ADD CONSTRAINT "disease_treatments_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pig_in_treatment" ADD CONSTRAINT "pig_in_treatment_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "disease_treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_logs" ADD CONSTRAINT "treatment_logs_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "disease_treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

