/*
  Warnings:

  - The values [PENDING,IN_PROGRESS] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('FABRICATION', 'WHOLE_PIECES');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('FABRIC', 'ZIPPER', 'DHAGA', 'BUTTON', 'ELASTIC', 'LACE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('KG', 'METER', 'PIECE', 'ROLL', 'DOZEN');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('ORDER_PLACED', 'CUTTING_IN_PROGRESS', 'CUTTING_DONE', 'STITCHING_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELIVERED');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'ORDER_PLACED';
COMMIT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "imageUrls" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "orderDescription" TEXT,
ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'FABRICATION',
ADD COLUMN     "patternId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'ORDER_PLACED';

-- CreateTable
CREATE TABLE "patterns" (
    "id" TEXT NOT NULL,
    "patternNumber" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloth_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloth_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabric_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fabric_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_dependencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "unit" "MaterialUnit" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "colors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_cloth_types" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clothTypeId" TEXT NOT NULL,

    CONSTRAINT "order_cloth_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_fabric_types" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fabricTypeId" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "order_fabric_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_materials" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "colorSelected" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_extra_dependencies" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "extraDependencyId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_extra_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patterns_patternNumber_key" ON "patterns"("patternNumber");

-- CreateIndex
CREATE INDEX "patterns_clientId_idx" ON "patterns"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "cloth_types_name_key" ON "cloth_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fabric_types_name_key" ON "fabric_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "extra_dependencies_name_key" ON "extra_dependencies"("name");

-- CreateIndex
CREATE INDEX "materials_type_idx" ON "materials"("type");

-- CreateIndex
CREATE UNIQUE INDEX "order_cloth_types_orderId_clothTypeId_key" ON "order_cloth_types"("orderId", "clothTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "order_fabric_types_orderId_fabricTypeId_key" ON "order_fabric_types"("orderId", "fabricTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "order_materials_orderId_materialId_colorSelected_key" ON "order_materials"("orderId", "materialId", "colorSelected");

-- CreateIndex
CREATE UNIQUE INDEX "order_extra_dependencies_orderId_extraDependencyId_key" ON "order_extra_dependencies"("orderId", "extraDependencyId");

-- CreateIndex
CREATE INDEX "expenses_orderId_idx" ON "expenses"("orderId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_clientId_idx" ON "orders"("clientId");

-- CreateIndex
CREATE INDEX "orders_patternId_idx" ON "orders"("patternId");

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cloth_types" ADD CONSTRAINT "order_cloth_types_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cloth_types" ADD CONSTRAINT "order_cloth_types_clothTypeId_fkey" FOREIGN KEY ("clothTypeId") REFERENCES "cloth_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fabric_types" ADD CONSTRAINT "order_fabric_types_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fabric_types" ADD CONSTRAINT "order_fabric_types_fabricTypeId_fkey" FOREIGN KEY ("fabricTypeId") REFERENCES "fabric_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_materials" ADD CONSTRAINT "order_materials_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_materials" ADD CONSTRAINT "order_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_extra_dependencies" ADD CONSTRAINT "order_extra_dependencies_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_extra_dependencies" ADD CONSTRAINT "order_extra_dependencies_extraDependencyId_fkey" FOREIGN KEY ("extraDependencyId") REFERENCES "extra_dependencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
