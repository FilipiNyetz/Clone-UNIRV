/*
  Warnings:

  - Added the required column `batchId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "batchId" TEXT NOT NULL;
