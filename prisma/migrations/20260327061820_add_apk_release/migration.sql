-- CreateTable
CREATE TABLE "ApkRelease" (
    "id" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "whatIsNew" TEXT[],
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "isStable" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApkRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApkRelease_fileId_key" ON "ApkRelease"("fileId");

-- AddForeignKey
ALTER TABLE "ApkRelease" ADD CONSTRAINT "ApkRelease_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
