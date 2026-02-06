import { PrismaClient } from "@prisma/client";

export async function seedArtists(prisma: PrismaClient) {
  console.log("🌱 Seeding Artists...");

  const artistsData = [
    {
      id: "6e50f8c5-5930-42df-816a-80205f638fe8",
      name: "BLACKPINK",
      bio: '4-member girl group from YG Entertainment, known for "DDU-DU DDU-DU", "Kill This Love", and "How You Like That"',
      imageUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/BlackpinkLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      instagramUsername: "blackpinkofficial",
      tiktokUsername: "bp_tiktok",
    },
    {
      id: "50855918-9ff0-4680-8fdb-c42cad726a0b",
      name: "SEVENTEEN",
      bio: '13-member boy group from Pledis Entertainment, self-producing group known for "Don\'t Wanna Cry", "Left & Right", and "Super"',
      imageUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/SeventeenLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      instagramUsername: "twicetagram", // Note: CSV had this for Seventeen, check if intentional
      tiktokUsername: "twice_tiktok_official",
    },
    {
      id: "c92efa7e-f38e-4798-b12f-6d932c690720",
      name: "BTS",
      bio: '7-member boy group from Big Hit Music, global superstars known for "Dynamite", "Butter", and "Spring Day"',
      imageUrl: "https://d1lq91nbxprxl1.cloudfront.net/uploads/BTSLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      tiktokUsername: "bts_official_bighit",
    },
    {
      id: "dfb1b106-0f16-4b6c-aca3-f549f51a86b9",
      name: "NewJeans",
      bio: '5-member girl group from ADOR (HYBE), rookie sensation known for "Attention", "Hype Boy", and "OMG"',
      imageUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/NewJeansLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
    },
    {
      id: "c422a883-c853-4cc5-a74d-0d2df6d861de",
      name: "TWICE",
      bio: "TWICE OFFICIAL INSTAGRAM",
      imageUrl:
        "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-19/551286007_18508082245067893_2795381767532650530_n.jpg?stp=dst-jpg_e0_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4zMjAuYzIifQ&_nc_ht=scontent-iad3-1.cdninstagram.com&_nc_cat=1&_nc_oc=Q6cZ2QGj29SC7FP08Lqk8KsZb7OLUQD9tKiTavRa7jkQd7-Q71wNcVEYuF-IMFRvrcWdh3E&_nc_ohc=GJ50iavuDewQ7kNvwFYtlNY&_nc_gid=_3-xSXyN60wkwO3vHK0oUw&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AfnIEWzFcVDA6m2j1Y-ka2dkamkpvhbAbemyYx_ohXnkkw&oe=694DC5BD&_nc_sid=8b3546",
      nationality: "South Korea",
      genre: "Instagram Creator",
    },
  ];

  for (const artist of artistsData) {
    await prisma.artist.upsert({
      where: { id: artist.id },
      update: artist,
      create: artist,
    });
  }

  console.log(`✅ Seeded/Updated ${artistsData.length} artists`);
}
