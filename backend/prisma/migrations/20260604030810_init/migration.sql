-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('CRICKET', 'KABADDI', 'FOOTBALL', 'BADMINTON', 'VOLLEYBALL', 'BASKETBALL', 'TENNIS', 'OTHER');

-- CreateEnum
CREATE TYPE "SurfaceType" AS ENUM ('TURF', 'CONCRETE', 'CLAY', 'SYNTHETIC', 'GRASS');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "profilePhotoUrl" TEXT,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "isGroundOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "skillLevel" "SkillLevel",
    "preferredRole" TEXT,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stats" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grounds" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "supportedSports" "Sport"[],
    "amenities" TEXT[],
    "surfaceType" "SurfaceType",
    "isIndoor" BOOLEAN NOT NULL DEFAULT false,
    "capacity" JSONB,
    "pricePerHour" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "photos" TEXT[],
    "rules" TEXT,
    "cancellationPolicy" TEXT,
    "contactPhone" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ground_slots" (
    "id" TEXT NOT NULL,
    "groundId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "slotDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "priceOverride" DOUBLE PRECISION,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "bookedById" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ground_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_city_idx" ON "users"("city");

-- CreateIndex
CREATE INDEX "user_sports_userId_idx" ON "user_sports"("userId");

-- CreateIndex
CREATE INDEX "user_sports_sport_idx" ON "user_sports"("sport");

-- CreateIndex
CREATE UNIQUE INDEX "user_sports_userId_sport_key" ON "user_sports"("userId", "sport");

-- CreateIndex
CREATE INDEX "grounds_ownerId_idx" ON "grounds"("ownerId");

-- CreateIndex
CREATE INDEX "grounds_city_idx" ON "grounds"("city");

-- CreateIndex
CREATE INDEX "grounds_pincode_idx" ON "grounds"("pincode");

-- CreateIndex
CREATE INDEX "grounds_isActive_isVerified_idx" ON "grounds"("isActive", "isVerified");

-- CreateIndex
CREATE INDEX "ground_slots_groundId_slotDate_status_idx" ON "ground_slots"("groundId", "slotDate", "status");

-- CreateIndex
CREATE INDEX "ground_slots_groundId_sport_idx" ON "ground_slots"("groundId", "sport");

-- CreateIndex
CREATE INDEX "ground_slots_status_idx" ON "ground_slots"("status");

-- AddForeignKey
ALTER TABLE "user_sports" ADD CONSTRAINT "user_sports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grounds" ADD CONSTRAINT "grounds_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_slots" ADD CONSTRAINT "ground_slots_groundId_fkey" FOREIGN KEY ("groundId") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_slots" ADD CONSTRAINT "ground_slots_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
