-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'ARF Seafoods',
    "businessTagline" TEXT NOT NULL DEFAULT 'Fresh from nature, delivered with care',
    "businessAddress" TEXT NOT NULL DEFAULT '',
    "businessMobile" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
