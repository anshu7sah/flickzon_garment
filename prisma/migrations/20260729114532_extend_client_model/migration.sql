-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'RETAILER', 'BOUTIQUE', 'WHOLESALER', 'MANUFACTURER', 'EXPORT_CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "businessRegNumber" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "clientCode" TEXT,
ADD COLUMN     "clientType" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "creditLimit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "currency" TEXT DEFAULT 'INR',
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "openingBalance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "preferredColour" TEXT,
ADD COLUMN     "preferredDeliveryMethod" TEXT,
ADD COLUMN     "preferredFabric" TEXT,
ADD COLUMN     "preferredGarmentType" TEXT,
ADD COLUMN     "preferredPaymentMethod" TEXT,
ADD COLUMN     "preferredSizeChart" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "secondaryPhone" TEXT,
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "client_notes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_notes_clientId_idx" ON "client_notes"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientCode_key" ON "clients"("clientCode");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_clientCode_idx" ON "clients"("clientCode");

-- CreateIndex
CREATE INDEX "clients_clientType_idx" ON "clients"("clientType");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
