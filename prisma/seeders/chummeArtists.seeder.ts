import { PrismaClient } from "@prisma/client";

export async function seedArtists(prisma: PrismaClient) {
  console.log("🌱 Seeding Artists...");

  const artistsData = [
    {
      id: "6e50f8c5-5930-42df-816a-80205f638fe8",
      name: "BLACKPINK official",
      bio: '4-member girl group from YG Entertainment, known for "DDU-DU DDU-DU", "Kill This Love", and "How You Like That"',
      imageUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/BlackpinkLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      socialPlatformUsername: "blackpinkofficial",
      platform: "INSTAGRAM",
    },
    {
      id: "50855918-9ff0-4680-8fdb-c42cad726a0b",
      name: "SEVENTEEN official",
      bio: '13-member boy group from Pledis Entertainment, self-producing group known for "Don\'t Wanna Cry", "Left & Right", and "Super"',
      imageUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/SeventeenLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      socialPlatformUsername: "saythename_17",
      platform: "INSTAGRAM",
    },
    {
      id: "c92efa7e-f38e-4798-b12f-6d932c690720",
      name: "BTS",
      bio: '7-member boy group from Big Hit Music, global superstars known for "Dynamite", "Butter", and "Spring Day"',
      imageUrl: "https://d1lq91nbxprxl1.cloudfront.net/uploads/BTSLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      socialPlatformUsername: "bts_official_bighit",
      platform: "TIKTOK",
    },
    {
      id: "dfb1b106-0f16-4b6c-aca3-f549f51a86b9",
      name: "NewJeans official",
      bio: '5-member girl group from ADOR (HYBE), rookie sensation known for "Attention", "Hype Boy", and "OMG"',
      imageUrl:
        "https://d1lq91nbxprxl1.cloudfront.net/uploads/NewJeansLogo.png",
      nationality: "South Korea",
      genre: "KPOP",
      socialPlatformUsername: "newjeans_official",
      platform: "YOUTUBE",
    },
    {
      id: "c422a883-c853-4cc5-a74d-0d2df6d861de",
      name: "TWICE official",
      bio: "TWICE OFFICIAL INSTAGRAM",
      imageUrl:
        "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-19/551286007_18508082245067893_2795381767532650530_n.jpg?stp=dst-jpg_e0_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4zMjAuYzIifQ&_nc_ht=scontent-iad3-1.cdninstagram.com&_nc_cat=1&_nc_oc=Q6cZ2QGj29SC7FP08Lqk8KsZb7OLUQD9tKiTavRa7jkQd7-Q71wNcVEYuF-IMFRvrcWdh3E&_nc_ohc=GJ50iavuDewQ7kNvwFYtlNY&_nc_gid=_3-xSXyN60wkwO3vHK0oUw&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AfnIEWzFcVDA6m2j1Y-ka2dkamkpvhbAbemyYx_ohXnkkw&oe=694DC5BD&_nc_sid=8b3546",
      nationality: "South Korea",
      genre: "Instagram Creator",
      socialPlatformUsername: "twicetagram",
      platform: "INSTAGRAM",
    },
    {
      id: "9cab6457-e586-4312-9351-93fb04262409",
      name: "Others....",
      bio: "Freelance Artist",
      imageUrl: "",
      nationality: "foreign",
      genre: "All track Records",
      socialPlatformUsername: "",
      platform: "YOUTUBE",
      isDraft: true,
    },
    {
      id: "97c60f60-0d0f-408c-b5a3-fe684b1b7232",
      name: "Enhypen  officail",
      bio: "ENHYPEN (엔하이픈) is a 7-member South Korean boy group under BE:LIFT Lab, a subsidiary label under HYBE",
      imageUrl: "",
      nationality: "korean",
      genre: "pop",
      socialPlatformUsername: "",
      platform: "YOUTUBE",
    },
    {
      id: "f8818235-b033-4882-a22d-3c6e677c0fa1",
      name: "Exo",
      bio: "South Korean-Chinese boy band based in Seoul formed by SM Entertainment in 2011 and debuted in 2012. The group consists of nine members",
      imageUrl: "",
      nationality: "korean",
      genre: "pop",
      socialPlatformUsername: "",
      platform: "YOUTUBE",
    },
    {
      id: "a123bc45-e89b-12d3-a456-426614174000",
      name: "Draft Testing Artist",
      bio: "System generated artist used solely to test isDraft=true query exclusions filters setups.",
      imageUrl: "",
      nationality: "Any",
      genre: "Test",
      socialPlatformUsername: "",
      platform: "YOUTUBE",
      isDraft: true,
    },
     // --- FROM CSV (chumme-artist.csv) ---
    {
      id: "57d7fee1-742d-48ed-9b4e-8c10ba61c248",
      name: "BLACKPINK",
      bio: null,
      imageUrl:
        "https://yt3.ggpht.com/U3VrCkKjzTpQ3VYv4SCPjNfDHeJV-swGNnhLYhr0nV4lZz_GVUNzK4EB-HFRfKv9S5VNh14uAg=s800-c-k-c0x00ffffff-no-rj",
      nationality: null,
      genre: null,
      platform: "YOUTUBE",
      socialPlatformUsername: "UCOmHUn--16B90oW2L6FRR3A",
    },
    {
      id: "dee214c0-c0bb-46c3-95cf-838c0920add4",
      name: "TWICE",
      bio: null,
      imageUrl:
        "https://yt3.ggpht.com/rj-m7CQIV8hIHx_lB8cjs0NxrDFJaUkVwZ5tCnZTNSVEr2IqXGF-2e7nr7og1IGeRXtHikce=s800-c-k-c0x00ffffff-no-rj",
      nationality: null,
      genre: null,
      platform: "YOUTUBE",
      socialPlatformUsername: "UCzgxx_DM2Dcb9Y1spb9mUJA",
    },
    {
      id: "9fe1371e-3fb3-479e-8bff-b0c4083bcafb",
      name: "SEVENTEEN",
      bio: null,
      imageUrl:
        "https://yt3.ggpht.com/8fqbFMfIjAMs6TuRGii5MEsXIdn5ZTliSbCPPfbZ8R07Pt15ht0n0OjexUCG8t4_q-c3YO2KXQ=s800-c-k-c0x00ffffff-no-rj",
      nationality: null,
      genre: null,
      platform: "YOUTUBE",
      socialPlatformUsername: "UCfkXDY7vwkcJ8ddFGz8KusA",
    },
    {
      id: "97596ade-6de5-4564-aaa8-f94dcbe405f8",
      name: "NewJeans",
      bio: null,
      imageUrl:
        "https://yt3.ggpht.com/LJXS4gAz-_rkoqcgixJplCAwOLQXRNTYnGhyZQoJMZ2Uyp_akqREktZnvxbmmbES_UDp9hTT9y8=s800-c-k-c0x00ffffff-no-rj",
      nationality: null,
      genre: null,
      platform: "YOUTUBE",
      socialPlatformUsername: "UCMki_UkHb4qSc0qyEcOHHJw",
    },
    {
      id: "5e3d6fec-30ce-43d9-a50c-86af43c4af46",
      name: "ENHYPEN",
      bio: null,
      imageUrl:
        "https://yt3.ggpht.com/gKp9WExdyzEEBpHM7WgVEgIhl7-yVhIAzOe1U5jJEYSYi17AbvUXyW4dGRk2KykXeCsgUhqD4A=s800-c-k-c0x00ffffff-no-rj",
      nationality: null,
      genre: null,
      platform: "YOUTUBE",
      socialPlatformUsername: "UCArLZtok93cO5R9RI4_Y5Jw",
    },
  ];

  for (const artist of artistsData) {
    await prisma.chummeArtist.upsert({
      where: { id: artist.id },
      update: {
        ...artist,
        isDeleted: false,
      },
      create: {
        ...artist,
        isDeleted: false,
      },
    });
  }

  console.log(`✅ Seeded/Updated ${artistsData.length} artists`);
}
