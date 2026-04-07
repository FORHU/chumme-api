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
      musicArtistId: "dee214c0-c0bb-46c3-95cf-838c0920add4",
    },
    {
      id: "434b118b-60fd-4482-ba2e-4d72d9f4c8b1",
      album: "Black Pink Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "57d7fee1-742d-48ed-9b4e-8c10ba61c248",
    },
    {
      id: "d7f29fc5-a684-4400-9a7a-20ff84ee3e14",
      album: "Enhypen Songs",
      genre: "pop",
      language: "any",
      musicArtistId: "5e3d6fec-30ce-43d9-a50c-86af43c4af46",
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
