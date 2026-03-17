-- CreateTable
CREATE TABLE "SocialIngestionSchedule" (
    "id" TEXT NOT NULL,
    "socialIngestionTargetId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'AUTO',
    "exactTime" TEXT,
    "intervalHours" INTEGER DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialIngestionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialIngestionSchedule_socialIngestionTargetId_idx" ON "SocialIngestionSchedule"("socialIngestionTargetId");

-- AddForeignKey
ALTER TABLE "SocialIngestionSchedule" ADD CONSTRAINT "SocialIngestionSchedule_socialIngestionTargetId_fkey" FOREIGN KEY ("socialIngestionTargetId") REFERENCES "SocialIngestionTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
