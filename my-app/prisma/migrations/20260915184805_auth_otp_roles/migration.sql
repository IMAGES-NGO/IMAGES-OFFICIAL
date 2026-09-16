/*
  Warnings:

  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "name",
ADD COLUMN     "otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "otp_hash" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
