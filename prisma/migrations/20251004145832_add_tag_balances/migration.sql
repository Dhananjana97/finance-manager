-- CreateTable
CREATE TABLE "public"."tag_balances" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_balances_tagId_accountId_currency_key" ON "public"."tag_balances"("tagId", "accountId", "currency");

-- AddForeignKey
ALTER TABLE "public"."tag_balances" ADD CONSTRAINT "tag_balances_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tag_balances" ADD CONSTRAINT "tag_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
