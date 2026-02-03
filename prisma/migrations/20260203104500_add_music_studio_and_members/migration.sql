-- CreateEnum
CREATE TYPE "StudioRole" AS ENUM ('LISTENER', 'SINGER', 'PRODUCER');

-- CreateTable
CREATE TABLE "StudioMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "role" "StudioRole" NOT NULL DEFAULT 'LISTENER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "StudioMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicStudio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "keyName" TEXT,
    "ownerId" TEXT NOT NULL,
    "musicRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicStudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioMember_studioId_idx" ON "StudioMember"("studioId");

-- CreateIndex
CREATE INDEX "StudioMember_userId_idx" ON "StudioMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioMember_userId_studioId_key" ON "StudioMember"("userId", "studioId");

-- AddForeignKey
ALTER TABLE "StudioMember" ADD CONSTRAINT "StudioMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioMember" ADD CONSTRAINT "StudioMember_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "MusicStudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicStudio" ADD CONSTRAINT "MusicStudio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicStudio" ADD CONSTRAINT "MusicStudio_musicRecordId_fkey" FOREIGN KEY ("musicRecordId") REFERENCES "MusicRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
