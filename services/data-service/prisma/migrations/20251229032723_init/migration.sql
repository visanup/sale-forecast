-- CreateTable
CREATE TABLE "monthly_access_control_material" (
    "id" BIGSERIAL NOT NULL,
    "anchor_month" DATE NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_desc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_access_control_material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_monthly_access_material_anchor_month" ON "monthly_access_control_material"("anchor_month");

-- CreateIndex
CREATE INDEX "idx_monthly_access_material_code" ON "monthly_access_control_material"("material_code");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_access_control_material_anchor_month_material_code_key" ON "monthly_access_control_material"("anchor_month", "material_code");
