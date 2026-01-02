-- CreateTable
CREATE TABLE "dim_company" (
    "company_id" BIGSERIAL NOT NULL,
    "company_code" TEXT NOT NULL,
    "company_desc" TEXT,

    CONSTRAINT "dim_company_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "dim_dept" (
    "dept_id" BIGSERIAL NOT NULL,
    "dept_code" TEXT NOT NULL,

    CONSTRAINT "dim_dept_pkey" PRIMARY KEY ("dept_id")
);

-- CreateTable
CREATE TABLE "dim_distribution_channel" (
    "dc_id" BIGSERIAL NOT NULL,
    "dc_code" TEXT NOT NULL,
    "dc_desc" TEXT,

    CONSTRAINT "dim_distribution_channel_pkey" PRIMARY KEY ("dc_id")
);

-- CreateTable
CREATE TABLE "dim_uom" (
    "uom_id" BIGSERIAL NOT NULL,
    "uom_code" TEXT NOT NULL,

    CONSTRAINT "dim_uom_pkey" PRIMARY KEY ("uom_id")
);

-- CreateTable
CREATE TABLE "dim_material" (
    "material_id" BIGSERIAL NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_desc" TEXT,

    CONSTRAINT "dim_material_pkey" PRIMARY KEY ("material_id")
);

-- CreateTable
CREATE TABLE "dim_sku" (
    "sku_id" BIGSERIAL NOT NULL,
    "material_id" BIGINT NOT NULL,
    "pack_size" TEXT NOT NULL,
    "uom_id" BIGINT NOT NULL,

    CONSTRAINT "dim_sku_pkey" PRIMARY KEY ("sku_id")
);

-- CreateTable
CREATE TABLE "dim_sales_org" (
    "sales_org_id" BIGSERIAL NOT NULL,
    "division" TEXT,
    "sales_organization" TEXT,
    "sales_office" TEXT,
    "sales_group" TEXT,
    "sales_representative" TEXT,

    CONSTRAINT "dim_sales_org_pkey" PRIMARY KEY ("sales_org_id")
);

-- CreateTable
CREATE TABLE "dim_month" (
    "month_id" DATE NOT NULL,
    "yyyy_mm" TEXT NOT NULL,

    CONSTRAINT "dim_month_pkey" PRIMARY KEY ("month_id")
);

-- CreateTable
CREATE TABLE "forecast_run" (
    "run_id" BIGSERIAL NOT NULL,
    "anchor_month" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "notes" TEXT,

    CONSTRAINT "forecast_run_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "fact_price" (
    "company_id" BIGINT NOT NULL,
    "sku_id" BIGINT NOT NULL,
    "month_id" DATE NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "fact_price_pkey" PRIMARY KEY ("company_id","sku_id","month_id")
);

-- CreateTable
CREATE TABLE "fact_forecast" (
    "run_id" BIGINT NOT NULL,
    "company_id" BIGINT NOT NULL,
    "dept_id" BIGINT NOT NULL,
    "sku_id" BIGINT NOT NULL,
    "sales_org_id" BIGINT NOT NULL,
    "dc_id" BIGINT NOT NULL,
    "month_id" DATE NOT NULL,
    "forecast_qty" DECIMAL(18,4) NOT NULL,
    "unit_price_snapshot" DECIMAL(18,4),
    "revenue_snapshot" DECIMAL(18,4),

    CONSTRAINT "fact_forecast_pkey" PRIMARY KEY ("run_id","company_id","dept_id","sku_id","sales_org_id","dc_id","month_id")
);

-- CreateTable
CREATE TABLE "saleforecast" (
    "id" BIGSERIAL NOT NULL,
    "anchor_month" DATE NOT NULL,
    "company_code" TEXT,
    "company_desc" TEXT,
    "material_code" TEXT,
    "material_desc" TEXT,
    "forecast_qty" DECIMAL(18,4) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saleforecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "record_id" TEXT,
    "performed_by" TEXT,
    "metadata" JSONB,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "user_email" TEXT,
    "user_username" TEXT,
    "client_id" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staging_forecast_uploads" (
    "id" BIGSERIAL NOT NULL,
    "batch_id" UUID NOT NULL,
    "raw_json" JSONB NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errors" JSONB,

    CONSTRAINT "staging_forecast_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_access_control" (
    "id" BIGSERIAL NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT,
    "anchor_month" DATE NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_access_control_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dim_company_company_code_key" ON "dim_company"("company_code");

-- CreateIndex
CREATE UNIQUE INDEX "dim_dept_dept_code_key" ON "dim_dept"("dept_code");

-- CreateIndex
CREATE UNIQUE INDEX "dim_distribution_channel_dc_code_key" ON "dim_distribution_channel"("dc_code");

-- CreateIndex
CREATE UNIQUE INDEX "dim_uom_uom_code_key" ON "dim_uom"("uom_code");

-- CreateIndex
CREATE UNIQUE INDEX "dim_material_material_code_key" ON "dim_material"("material_code");

-- CreateIndex
CREATE UNIQUE INDEX "dim_sku_material_id_pack_size_uom_id_key" ON "dim_sku"("material_id", "pack_size", "uom_id");

-- CreateIndex
CREATE UNIQUE INDEX "dim_sales_org_division_sales_organization_sales_office_sale_key" ON "dim_sales_org"("division", "sales_organization", "sales_office", "sales_group", "sales_representative");

-- CreateIndex
CREATE UNIQUE INDEX "dim_month_yyyy_mm_key" ON "dim_month"("yyyy_mm");

-- CreateIndex
CREATE INDEX "idx_saleforecast_anchor_month" ON "saleforecast"("anchor_month");

-- CreateIndex
CREATE INDEX "idx_saleforecast_company_code" ON "saleforecast"("company_code");

-- CreateIndex
CREATE INDEX "idx_saleforecast_material_code" ON "saleforecast"("material_code");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_performed_at" ON "audit_logs"("performed_at");

-- CreateIndex
CREATE INDEX "idx_monthly_access_anchor_month" ON "monthly_access_control"("anchor_month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_access_control_user_email_anchor_month_key" ON "monthly_access_control"("user_email", "anchor_month");
