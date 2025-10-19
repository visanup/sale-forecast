-- Add saleforecast table
CREATE TABLE IF NOT EXISTS "saleforecast" (
  "id" BIGSERIAL PRIMARY KEY,
  "anchor_month" DATE NOT NULL,
  "company_code" TEXT,
  "company_desc" TEXT,
  "material_code" TEXT,
  "material_desc" TEXT,
  "forecast_qty" DECIMAL(18,4) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_saleforecast_anchor_month" ON "saleforecast"("anchor_month");
CREATE INDEX IF NOT EXISTS "idx_saleforecast_company_code" ON "saleforecast"("company_code");
CREATE INDEX IF NOT EXISTS "idx_saleforecast_material_code" ON "saleforecast"("material_code");

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_saleforecast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saleforecast_updated_at ON "saleforecast";
CREATE TRIGGER trg_saleforecast_updated_at
BEFORE UPDATE ON "saleforecast"
FOR EACH ROW EXECUTE FUNCTION update_saleforecast_updated_at();

-- Add audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" BIGSERIAL PRIMARY KEY,
  "service" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "record_id" TEXT,
  "performed_by" TEXT,
  "metadata" JSONB,
  "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_performed_at" ON "audit_logs"("performed_at");
