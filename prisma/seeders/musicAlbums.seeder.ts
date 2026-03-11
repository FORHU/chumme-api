import { PrismaClient } from "@prisma/client";

export async function seedAlbums(prisma: PrismaClient) {
  console.log("🌱 Seeding Music Albums...");

  const albumsData = [
    {
      id: "6b73e8f6-8fdc-4c79-a5e7-8a1527fda24a",
      album: "All Artist Record",
      genre: "All of the artist",
      language: "any",
      musicArtistId: "9cab6457-e586-4312-9351-93fb04262409",
    },
    {
      id: "37c728a2-ed10-4dea-a496-22c2ee97e935",
      album: "BTS Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "c92efa7e-f38e-4798-b12f-6d932c690720",
    },
    {
      id: "36a5eb68-7b51-4049-9dc8-ec60a6ed5d3e",
      album: "Twice Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "c422a883-c853-4cc5-a74d-0d2df6d861de",
    },
    {
      id: "434b118b-60fd-4482-ba2e-4d72d9f4c8b1",
      album: "Black Pink Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "6e50f8c5-5930-42df-816a-80205f638fe8",
    },
    {
      id: "d7f29fc5-a684-4400-9a7a-20ff84ee3e14",
      album: "Enhypen Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "97c60f60-0d0f-408c-b5a3-fe684b1b7232",
    },
    {
      id: "e6e64c57-a7a5-4a3f-9e4f-a37b1055658a",
      album: "Exo Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "f8818235-b033-4882-a22d-3c6e677c0fa1",
    },
  ];

  for (const album of albumsData) {
    await prisma.musicAlbum.upsert({
      where: { id: album.id },
      update: album,
      create: album,
    });
  }

  console.log(`✅ Seeded/Updated ${albumsData.length} music albums`);
}
