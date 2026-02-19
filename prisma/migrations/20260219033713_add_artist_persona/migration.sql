-- CreateTable
CREATE TABLE "ArtistPersona" (
    "id" TEXT NOT NULL,
    "artistId" TEXT,
    "personaVoiceId" TEXT NOT NULL,
    "personaImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ArtistPersona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistPersona_artistId_key" ON "ArtistPersona"("artistId");

-- CreateIndex
CREATE INDEX "ArtistPersona_artistId_idx" ON "ArtistPersona"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistPersona" ADD CONSTRAINT "ArtistPersona_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistPersona" ADD CONSTRAINT "ArtistPersona_personaImageId_fkey" FOREIGN KEY ("personaImageId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
