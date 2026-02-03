import { PrismaClient } from "@prisma/client";

export async function seedArtists(prisma: PrismaClient) {
  console.log("🌱 Seeding Artists...");
  const artists = await prisma.artist.createMany({
    data: [
      {
        name: "BTS",
        bio: '7-member boy group from Big Hit Music, global superstars known for "Dynamite", "Butter", and "Spring Day"',
        nationality: "South Korea",
        genre: "KPOP",
      },
      {
        name: "BLACKPINK",
        bio: '4-member girl group from YG Entertainment, known for "DDU-DU DDU-DU", "Kill This Love", and "How You Like That"',
        nationality: "South Korea",
        genre: "KPOP",
      },
      {
        name: "TWICE",
        bio: '9-member girl group from JYP Entertainment, known for catchy hits like "Cheer Up", "TT", and "Fancy"',
        nationality: "South Korea",
        genre: "KPOP",
      },
      {
        name: "SEVENTEEN",
        bio: '13-member boy group from Pledis Entertainment, self-producing group known for "Don\'t Wanna Cry", "Left & Right", and "Super"',
        nationality: "South Korea",
        genre: "KPOP",
      },
      {
        name: "NewJeans",
        bio: '5-member girl group from ADOR (HYBE), rookie sensation known for "Attention", "Hype Boy", and "OMG"',
        nationality: "South Korea",
        genre: "KPOP",
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Seeded ${artists.count} artists`);
}
