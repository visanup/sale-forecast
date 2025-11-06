-- Add role enum and user.role column, remove legacy role tables

CREATE TYPE "auth"."Role" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "auth"."users"
  ADD COLUMN "role" "auth"."Role" NOT NULL DEFAULT 'USER';

DROP TABLE IF EXISTS "auth"."user_roles";
DROP TABLE IF EXISTS "auth"."roles";
