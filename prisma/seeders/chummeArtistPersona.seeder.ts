import { PrismaClient } from "@prisma/client";

/**
 * Seeds ChummeArtistPersona data from JSON
 */
export async function seedChummeArtistPersonas(prisma: PrismaClient) {
  console.log("🌱 Seeding Chumme Artist Personas...");

  const personaData = [
    {
      id: "7e5a3c9b-2c4b-4b4f-9a66-9f2f1a5d7b1c",
      name: "Lisa",
      persona: "blackpink-lisa",
      voiceKey: "d96aW8wGtVRyMUyHCDCu",
      imagePathId: "35a940e2-a66c-42c3-93c9-4345577754ee",
      audioPathId: "1831150d-9aa1-4948-890e-5e7d3fa98d0f",
      videoPathId: null,
    },
    // gif
    // {
    //     "id": "35a940e2-a66c-42c3-93c9-4345577754ee",
    //     "filename": "blackpink-lisa.gif",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208184912-0d0be884409b8f53.gif",
    //     "createdAt": "2026-03-11T05:49:45.966Z",
    //     "updatedAt": "2026-03-11T05:49:45.966Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    // Image
    // {
    //     "id": "1831150d-9aa1-4948-890e-5e7d3fa98d0f",
    //     "filename": "blackpink-lisa-intro.mp3",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208238614-ef54338368b2f419.mp3",
    //     "createdAt": "2026-03-11T05:50:39.266Z",
    //     "updatedAt": "2026-03-11T05:50:39.266Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    {
      id: "c1b0e4d6-1b2a-4a7a-8c63-53b89e2f0c4a",
      name: "Jennie",
      persona: "blackpink-jennie",
      voiceKey: "d96aW8wGtVRyMUyHCDCu",
      imagePathId: "1744a3af-6068-4544-9928-32a47e9d3eb5",
      audioPathId: "0ad41eb8-139e-46aa-9f24-1b76fe9d6c88",
      videoPathId: null,
    },
    // GIF
    // {
    //     "id": "1744a3af-6068-4544-9928-32a47e9d3eb5",
    //     "filename": "blackpink-jennie.gif",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773207896846-9d084f44d0ef7eed.gif",
    //     "createdAt": "2026-03-11T05:44:57.924Z",
    //     "updatedAt": "2026-03-11T05:44:57.924Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    // Audio
    // {
    //     "id": "0ad41eb8-139e-46aa-9f24-1b76fe9d6c88",
    //     "filename": "blackpink-jennie-intro.mp3",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208015160-3ba6a93a668fb881.mp3",
    //     "createdAt": "2026-03-11T05:46:55.773Z",
    //     "updatedAt": "2026-03-11T05:46:55.773Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    {
      id: "3f6d52b4-0a90-4d8c-9c14-6d7b8a9e1e2f",
      name: "Rosé",
      persona: "blackpink-rose",
      voiceKey: "BwPLRHFEFSyq7fzBkN2T",
      imagePathId: "f7255fda-46fd-4566-98f2-768f09fab84b",
      audioPathId: "37081a88-cfc7-4089-83c4-f1dbf48b980c",
      videoPathId: "dd84583a-212f-4ef4-b3e3-9bfb48c59b54",
    },
    // Gif
    // {
    //     "id": "f7255fda-46fd-4566-98f2-768f09fab84b",
    //     "filename": "blackpink-rose.gif",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208309450-6f0050bd70a03fd3.gif",
    //     "createdAt": "2026-03-11T05:51:50.359Z",
    //     "updatedAt": "2026-03-11T05:51:50.359Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    // mp3
    // {
    //     "id": "37081a88-cfc7-4089-83c4-f1dbf48b980c",
    //     "filename": "blackpink-rose-intro.mp3",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208404929-928bcbf471061227.mp3",
    //     "createdAt": "2026-03-11T05:53:25.538Z",
    //     "updatedAt": "2026-03-11T05:53:25.538Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    // mp4
    // {
    //     "id": "dd84583a-212f-4ef4-b3e3-9bfb48c59b54",
    //     "filename": "blackpink-rose.mp4",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208457346-cf7061b7fa1873b5.mp4",
    //     "createdAt": "2026-03-11T05:54:18.393Z",
    //     "updatedAt": "2026-03-11T05:54:18.393Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    {
      id: "9b8f4e2a-5d6f-4e1c-bc9b-3e2f7d1a6c8d",
      name: "Jisoo",
      persona: "blackpink-jisoo",
      voiceKey: "dkYcRTaPLxuk6Mf4RPkE",
      imagePathId: "f11d3f7d-2f54-4767-9762-9ede453120a4",
      audioPathId: "89c35e65-1a2a-42ba-bac9-ee2576286570",
      videoPathId: null,
    },
    // Gif
    // {
    //     "id": "f11d3f7d-2f54-4767-9762-9ede453120a4",
    //     "filename": "blackpink-jisoo.gif",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208592508-a4bcaf6b56001f65.gif",
    //     "createdAt": "2026-03-11T05:56:33.487Z",
    //     "updatedAt": "2026-03-11T05:56:33.487Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    // mp3
    // {
    //     "id": "89c35e65-1a2a-42ba-bac9-ee2576286570",
    //     "filename": "blackpink-jisoo-intro.mp3",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208622663-5eed3392abc56a65.mp3",
    //     "createdAt": "2026-03-11T05:57:03.255Z",
    //     "updatedAt": "2026-03-11T05:57:03.255Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
    {
      id: "e4d7a2c1-6b9e-4b2f-a0c8-1f3e5d7b9a6c",
      name: "Chumme",
      persona: "chumme-bot",
      voiceKey: "pvtNhC0dceaRGTXfVxh2",
      imagePathId: "f93dad3b-01ae-47a1-b48f-1e4924008d36",
      audioPathId: null,
      videoPathId: null,
    },
    // {
    //     "id": "f93dad3b-01ae-47a1-b48f-1e4924008d36",
    //     "filename": "5.gif",
    //     "fileUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208732885-0313f0312991789e.gif",
    //     "createdAt": "2026-03-11T05:58:53.938Z",
    //     "updatedAt": "2026-03-11T05:58:53.938Z",
    //     "deletedAt": null,
    //     "metaData": null
    // }
  ];

  const fileSeedData = [
    {
      id: "35a940e2-a66c-42c3-93c9-4345577754ee",
      filename: "blackpink-lisa.gif",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208184912-0d0be884409b8f53.gif",
    },
    {
      id: "1831150d-9aa1-4948-890e-5e7d3fa98d0f",
      filename: "blackpink-lisa-intro.mp3",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208238614-ef54338368b2f419.mp3",
    },
    {
      id: "1744a3af-6068-4544-9928-32a47e9d3eb5",
      filename: "blackpink-jennie.gif",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773207896846-9d084f44d0ef7eed.gif",
    },
    {
      id: "0ad41eb8-139e-46aa-9f24-1b76fe9d6c88",
      filename: "blackpink-jennie-intro.mp3",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208015160-3ba6a93a668fb881.mp3",
    },
    {
      id: "f7255fda-46fd-4566-98f2-768f09fab84b",
      filename: "blackpink-rose.gif",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208309450-6f0050bd70a03fd3.gif",
    },
    {
      id: "37081a88-cfc7-4089-83c4-f1dbf48b980c",
      filename: "blackpink-rose-intro.mp3",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208404929-928bcbf471061227.mp3",
    },
    {
      id: "dd84583a-212f-4ef4-b3e3-9bfb48c59b54",
      filename: "blackpink-rose.mp4",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208457346-cf7061b7fa1873b5.mp4",
    },
    {
      id: "f11d3f7d-2f54-4767-9762-9ede453120a4",
      filename: "blackpink-jisoo.gif",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208592508-a4bcaf6b56001f65.gif",
    },
    {
      id: "89c35e65-1a2a-42ba-bac9-ee2576286570",
      filename: "blackpink-jisoo-intro.mp3",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208622663-5eed3392abc56a65.mp3",
    },
    {
      id: "f93dad3b-01ae-47a1-b48f-1e4924008d36",
      filename: "5.gif",
      fileUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/1773208732885-0313f0312991789e.gif",
    },
  ];

  console.log("📁 Seeding Files from metadata...");
  for (const file of fileSeedData) {
    await prisma.file.upsert({
      where: { id: file.id },
      update: file,
      create: file,
    });
  }

  for (const item of personaData) {
    // 3. Upsert Persona using user-provided IDs
    await prisma.chummeArtistPersona.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        voiceKey: item.voiceKey,
        persona: item.persona,
        imagePathId: item.imagePathId,
        audioPathId: item.audioPathId,
        videoPathId: item.videoPathId,
      },
      create: {
        id: item.id,
        name: item.name,
        voiceKey: item.voiceKey,
        persona: item.persona,
        imagePathId: item.imagePathId,
        audioPathId: item.audioPathId,
        videoPathId: item.videoPathId,
      },
    });

    console.log(`✅ Seeded Persona for: ${item.name}`);
  }
}
