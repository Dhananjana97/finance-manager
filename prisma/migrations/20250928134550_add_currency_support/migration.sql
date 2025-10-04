-- AlterTable
ALTER TABLE "public"."accounts" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."transaction_entries" ADD COLUMN     "exchangeRate" DECIMAL(65,30),
ADD COLUMN     "originalAmount" DECIMAL(65,30),
ADD COLUMN     "originalCurrency" TEXT;

-- CreateTable
CREATE TABLE "public"."exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_date_key" ON "public"."exchange_rates"("fromCurrency", "toCurrency", "date");
