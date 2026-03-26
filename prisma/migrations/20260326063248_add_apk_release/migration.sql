-- CreateTable
CREATE TABLE "ApkRelease" (
    "id" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" DOUBLE PRECISION NOT NULL,
    "whatIsNew" TEXT[],
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "isStable" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApkRelease_pkey" PRIMARY KEY ("id")
);
