import { PrismaClient } from "@prisma/client";

/**
 * Seeds Chumme Categories (Countries) with fixed UUIDs
 */
export async function seedChummeCategories(prisma: PrismaClient) {
  console.log("🌱 Seeding Countries as Chumme Categories...");

  // 1. Get or create admin user for ownership
  let systemUser = await prisma.user.findFirst({
    where: { email: "aiforhu@gmail.com" },
  });

  if (!systemUser) {
    systemUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });
  }

  if (!systemUser) {
    console.log(
      "⚠️ No users found to assign as owner. Skipping category seeding.",
    );
    return;
  }

  // 2. Define Countries (Chumme Categories)
  const communitiesData = [
    {
      id: "f2d7e7c3-5c64-4f6c-9c9a-7a8f3f4e91a1",
      name: "Chumme Nation",
      note: "The heart of the Chumme universe — a global digital nation where communities from every country connect, share ideas, create culture, and build friendships beyond borders.",
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 50, y: 50 },
      sizeSet: { radius: 6, maxRadius: 120 },
      isAd: false,
      border: { width: 3, color: "#000", style: "solid" },
      shadow: { x: 0, y: 4, blur: 12, color: "#888" },
      opacity: 1,
      capacity: 100000000,
      status: "active",
      tags: ["Global", "Chumme", "World Community", "Digital Nation"],
      emojiIcon: "🌍",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "96b3c9bf-1077-46aa-b37d-f16f28486936",
      name: "United States",
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 20, y: 25 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 2000000,
      status: "active",
      tags: ["USA", "North America"],
      emojiIcon: "🇺🇸",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "77a9a080-bf60-4feb-9bbd-c0727c774ebd",
      name: "United Kingdom",
      colorSet: { primary: "#2a45ff", secondary: "#60a5fa", border: "#2a45ff" },
      position: { x: 60, y: 20 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 850000,
      status: "active",
      tags: ["UK", "Europe"],
      emojiIcon: "🇬🇧",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "4ed0e800-c7a6-41d8-9c1a-7463c67e9126",
      name: "Japan",
      colorSet: { primary: "#ff0095", secondary: "#f472b6", border: "#ff0095" },
      position: { x: 80, y: 45 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 1500000,
      status: "active",
      tags: ["Japan", "Asia"],
      emojiIcon: "🇯🇵",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "f7ac5ac8-5a1d-4b4f-b5c0-45eb3102bc3d",
      name: "South Korea",
      colorSet: { primary: "#fbbf24", secondary: "#fcd34d", border: "#fbbf24" },
      position: { x: 25, y: 65 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 180000,
      status: "active",
      tags: ["Korea", "Asia"],
      emojiIcon: "🇰🇷",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "1e888904-a298-4091-bdbf-6a3206bc8ee6",
      name: "Canada",
      colorSet: { primary: "#06b6d4", secondary: "#22d3ee", border: "#06b6d4" },
      position: { x: 10, y: 55 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 650000,
      status: "active",
      tags: ["Canada", "North America"],
      emojiIcon: "🇨🇦",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "cbe1ffec-945b-4128-a580-4e58cd7f4b6b",
      name: "Australia",
      colorSet: { primary: "#8b5cf6", secondary: "#a78bfa", border: "#8b5cf6" },
      position: { x: 70, y: 80 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 450000,
      status: "active",
      tags: ["Australia", "Oceania"],
      emojiIcon: "🇦🇺",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "4fa52b4d-287e-4be4-a9fb-af71fefcb6d1",
      name: "Brazil",
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 35, y: 85 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 250000,
      status: "active",
      tags: ["Brazil", "South America"],
      emojiIcon: "🇧🇷",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "74043e34-6f34-4d01-beee-63a4b5348b70",
      name: "Indonesia",
      colorSet: { primary: "#2a45ff", secondary: "#60a5fa", border: "#2a45ff" },
      position: { x: 85, y: 70 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 180000,
      status: "active",
      tags: ["Indonesia", "Asia"],
      emojiIcon: "🇮🇩",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },

    {
      id: "a6c88d69-6d17-4b88-8c6d-3e9d9e7bdb01",
      name: "Philippines",
      colorSet: { primary: "#f97316", secondary: "#fb923c", border: "#f97316" },
      position: { x: 52, y: 70 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 900000,
      status: "active",
      tags: ["Philippines", "Asia"],
      emojiIcon: "🇵🇭",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "2c6d44e6-33a8-4e47-8e3b-bd1fbd5fa102",
      name: "India",
      colorSet: { primary: "#22c55e", secondary: "#4ade80", border: "#22c55e" },
      position: { x: 72, y: 40 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 2500000,
      status: "active",
      tags: ["India", "Asia"],
      emojiIcon: "🇮🇳",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "e24d4f59-15b4-4b36-bfe3-5e3ed2c9c103",
      name: "Germany",
      colorSet: { primary: "#ef4444", secondary: "#f87171", border: "#ef4444" },
      position: { x: 55, y: 12 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 700000,
      status: "active",
      tags: ["Germany", "Europe"],
      emojiIcon: "🇩🇪",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
    {
      id: "94a0ad14-b1d7-4d2b-b10d-45f8b2a4d104",
      name: "France",
      colorSet: { primary: "#6366f1", secondary: "#818cf8", border: "#6366f1" },
      position: { x: 47, y: 18 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 620000,
      status: "active",
      tags: ["France", "Europe"],
      emojiIcon: "🇫🇷",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
    },
  ];

  const categoriesData = [
    {
      id: "7a1c7d6c-2f45-4a9d-9c9e-5a6e7b3c11f2",
      name: "Music",
      chummeTraits: "ENTERTAINMENT",
      note: "Songs, artists, bands, albums, concerts, and music culture.",
      discoveryKeywords: ["music trending", "new music releases", "billboard hot 100", "popular music videos"],
      subcategories: [
        {
          id: "5e3f6d8b-21e1-4c79-91aa-0f1b23c3d4e5",
          name: "K-pop",
          note: "Popular music from South Korean artists and idol groups.",
          discoveryKeywords: ["kpop trending", "new kpop groups", "kpop music show", "kpop debut"],
          topiccategories: [
            {
              id: "0c2e1f4a-6e57-4a4e-9d1e-32e1d9f7a111",
              name: "BTS",
              note: "Global K-pop boy group.",
            },
            {
              id: "cfa92b76-31c1-4f0d-82a2-d98a4e72c112",
              name: "BLACKPINK",
              note: "Popular K-pop girl group.",
            },
            {
              id: "1aab8a22-4b66-4f5f-9e51-6f2f9f93c113",
              name: "EXO",
              note: "K-pop boy group known for powerful vocals.",
            },
            {
              id: "e7b5a4f2-53b5-4b6f-a6e7-3e8a9f20c114",
              name: "TWICE",
              note: "Top-selling K-pop girl group.",
            },
            {
              id: "0c1a2d33-8c11-4c71-b1f0-6f2d1f221201",
              name: "SEVENTEEN",
              note: "Self-producing K-pop boy group.",
            },
            {
              id: "6a3b8c01-5c4d-4c51-8e90-9c10b3f21202",
              name: "Stray Kids",
              note: "4th generation K-pop boy group.",
            },
            {
              id: "1c92a3f0-7e44-4d55-bc1e-0a1d332a1203",
              name: "NCT",
              note: "Global K-pop group with multiple units.",
            },
            {
              id: "c3a82c90-4b33-4b0c-9b99-2d8c1caa1204",
              name: "Red Velvet",
              note: "K-pop girl group from SM Entertainment.",
            },
            {
              id: "9b0d7b12-3e41-4f6b-a1d9-7c3dfe8d1205",
              name: "ITZY",
              note: "4th generation K-pop girl group.",
            },
            {
              id: "c1b3f8e1-44a5-4c01-9e73-7f1a3f0d1206",
              name: "ATEEZ",
              note: "K-pop boy group known for powerful performances.",
            },
            {
              id: "8e9c1b77-0d13-49d3-9f10-2b7b9a1f1207",
              name: "ENHYPEN",
              note: "K-pop boy group formed through I-LAND.",
            },
            {
              id: "f8e44b20-2d51-4d89-8b3a-0fbc2c7f1208",
              name: "TXT",
              note: "Tomorrow X Together, boy group under HYBE.",
            },
            {
              id: "3b7c81e5-ff02-4b09-bcaa-d9e2fa8b1209",
              name: "LE SSERAFIM",
              note: "HYBE girl group.",
            },
            {
              id: "b20d9a41-7d62-4c77-a6c4-2d72f3f01210",
              name: "IVE",
              note: "Popular 4th generation girl group.",
            },
            {
              id: "a18b7c5d-3d7e-4d21-b3d1-1e5a9f0c1211",
              name: "NewJeans",
              note: "Trending 4th generation K-pop girl group.",
            },
            {
              id: "dd9e0e01-5a83-4e9e-9b21-3c5c7fdf1212",
              name: "(G)I-DLE",
              note: "Self-producing K-pop girl group.",
            },
            {
              id: "0e3c5a2d-bb8c-41aa-8c6a-b1e8d5fd1213",
              name: "MAMAMOO",
              note: "Girl group known for strong vocals.",
            },
            {
              id: "4f1a3a21-9a5b-4c77-81bb-99c9d2111214",
              name: "BIGBANG",
              note: "Legendary K-pop boy group.",
            },
            {
              id: "abcc93e1-9b3a-4d91-a4b2-5e8a8e021215",
              name: "Super Junior",
              note: "Veteran K-pop boy group.",
            },
            {
              id: "92b7e7c4-41f7-4fbb-b81c-7b92d4f21216",
              name: "Girls’ Generation",
              note: "Legendary K-pop girl group (SNSD).",
            },
            {
              id: "7c4d22c8-9d11-4f2b-ae88-0a77d8211217",
              name: "IU",
              note: "One of the most famous Korean solo artists.",
            },
            {
              id: "1e22e5f1-88e7-4b0f-a5b3-39d7bbcd1218",
              name: "Taeyeon",
              note: "Girls’ Generation leader and soloist.",
            },
            {
              id: "0f31d8d9-5f6c-4c99-96a2-8e22c3af1219",
              name: "Baekhyun",
              note: "EXO vocalist and solo artist.",
            },
            {
              id: "e9127d33-2f9d-4c6a-9f7c-61e4e6de1220",
              name: "Taemin",
              note: "SHINee member and solo performer.",
            },
            {
              id: "1d7e1f0a-1b3e-4f44-80b9-9e4a2a8c1221",
              name: "Jennie",
              note: "BLACKPINK member and solo artist.",
            },
            {
              id: "7a33f4c2-0a1d-4a6d-a1d3-4d2c7c771222",
              name: "Lisa",
              note: "BLACKPINK rapper and global star.",
            },
            {
              id: "6c3e19f2-8a7c-4d51-9d66-3b2b63d81223",
              name: "Rosé",
              note: "BLACKPINK vocalist and solo artist.",
            },
            {
              id: "c1a2e6c7-8b9f-4d21-8b2c-9a6b51d71224",
              name: "Jisoo",
              note: "BLACKPINK member and actress.",
            },
          ],
        },
        {
          id: "0d5f3c77-18c4-4f7c-8f9a-8a7d1b2c3d4e",
          name: "Rock",
          note: "Rock bands, guitar music, and live performances.",
          discoveryKeywords: ["rock music", "rock bands", "live rock", "classic rock"],
          topiccategories: [
            {
              id: "8d94a5f1-6a22-4c8d-9b21-4c1f9d01c121",
              name: "Queen",
              note: "Legendary British rock band led by Freddie Mercury.",
            },
            {
              id: "a4d6f9c7-0c1a-4e92-b3a1-98f5c5e1c122",
              name: "The Beatles",
              note: "One of the most influential rock bands of all time.",
            },
            {
              id: "2b0a1a5e-5c1b-4b3d-a7b9-01f1d8f2c123",
              name: "Led Zeppelin",
              note: "Iconic rock band known for heavy guitar riffs.",
            },
            {
              id: "c93d6b87-73a3-4c0c-82d1-bf1f9a12c124",
              name: "Pink Floyd",
              note: "Progressive rock band known for concept albums.",
            },
            {
              id: "c6e4c0c7-7d1a-4c21-9c91-7b2c1a3d2001",
              name: "Nirvana",
              note: "Grunge rock band led by Kurt Cobain.",
            },
            {
              id: "f2c1b9d7-8a3f-4a9e-b211-2a8b7d3c2002",
              name: "Metallica",
              note: "American heavy metal and rock band.",
            },
            {
              id: "0c1a92d7-5c1e-4a7f-b221-1b1e7d4f2003",
              name: "Guns N' Roses",
              note: "Hard rock band known for 'Sweet Child O' Mine'.",
            },
            {
              id: "d7a3c1f9-8b1d-4c6e-9a11-5c7b2d9e2004",
              name: "AC/DC",
              note: "Australian rock band famous for high-energy music.",
            },
            {
              id: "e7a2d1c9-1b7a-4f2b-a991-6e8b1c0f2005",
              name: "Linkin Park",
              note: "Rock band blending alternative rock and nu metal.",
            },
            {
              id: "a3d7b1c0-7f5e-4a9c-b111-2f1c6e9d2006",
              name: "Foo Fighters",
              note: "Rock band formed by Dave Grohl.",
            },
            {
              id: "b5a8c7d1-1c2f-4a9e-b911-8d7c2e1a2007",
              name: "Red Hot Chili Peppers",
              note: "Funk rock band known for energetic performances.",
            },
            {
              id: "d1c7a8e2-5f2a-4b1c-a191-9e2d3c7a2008",
              name: "Green Day",
              note: "Punk rock band known for 'American Idiot'.",
            },
            {
              id: "c2e7b1a9-6f3d-4c7e-a711-4b2e9d3c2009",
              name: "Arctic Monkeys",
              note: "British indie rock band.",
            },
            {
              id: "f9b7a1c2-4e6a-4c9f-b211-3c8e1d2a2010",
              name: "The Rolling Stones",
              note: "Legendary British rock band.",
            },
          ],
        },
      ],
    },
    {
      id: "a5c9c3d8-4b33-4c92-9c6b-1a0d9e7b3333",
      name: "Basketball",
      chummeTraits: "ENTERTAINMENT",
      note: "Basketball games, leagues, players, highlights, and training.",
      discoveryKeywords: ["basketball highlights", "nba news", "basketball training", "streetball"],
      subcategories: [
        {
          id: "3e5b8d1c-3d4e-49c8-bc19-2a1e4f6d7b8c",
          name: "NBA",
          note: "National Basketball Association league updates.",
          discoveryKeywords: ["nba highlights", "lebron james", "stephen curry", "nba playoffs"],
          topiccategories: [
            {
              id: "4a8e9c77-64d2-4c1f-b4e1-29d5f9c3b301",
              name: "LeBron James",
              note: "Los Angeles Lakers superstar and NBA legend.",
            },
            {
              id: "d5c7b93f-7f93-4d1b-90e3-7c1d2e4f3302",
              name: "Stephen Curry",
              note: "Golden State Warriors point guard and greatest shooter.",
            },
            {
              id: "0b1e2f9a-bc8f-4d4b-86f7-5a8c7c6b3303",
              name: "Kevin Durant",
              note: "Elite scorer and NBA champion.",
            },
            {
              id: "a7c2e1f4-9d1b-4a9e-8f3d-3c5a1b2d3304",
              name: "Giannis Antetokounmpo",
              note: "Milwaukee Bucks superstar known as the Greek Freak.",
            },
            {
              id: "b1d3e9c2-4f7b-4b1c-9a6d-1e2c5a7f3305",
              name: "Luka Dončić",
              note: "Dallas Mavericks star known for elite playmaking.",
            },
            {
              id: "c4e7a9b2-5d1f-4c2e-a7c3-9b2d1e6a3306",
              name: "Nikola Jokić",
              note: "Denver Nuggets MVP center.",
            },
            {
              id: "d9a1b7c3-8e4f-4a7d-9b2c-1c3a5d6e3307",
              name: "Joel Embiid",
              note: "Dominant center and MVP-caliber player.",
            },
            {
              id: "e2a7c3d1-4b9f-4d8e-a1b7-2c3e5a6d3308",
              name: "Jayson Tatum",
              note: "Boston Celtics star forward.",
            },
            {
              id: "f1c2d3a4-6e7f-4b1d-a2c3-5d6e7f8a3309",
              name: "Kawhi Leonard",
              note: "Two-time NBA Finals MVP.",
            },
            {
              id: "a9c8b7d6-1e2f-4a3b-9c8d-7e6f5a4b3310",
              name: "Damian Lillard",
              note: "Elite clutch shooter and point guard.",
            },
            {
              id: "b3c1d2e4-7f5a-4d8e-b9c1-2a3d5e6f3311",
              name: "Anthony Davis",
              note: "Los Angeles Lakers All-Star big man.",
            },
            {
              id: "c9a7b5d3-1f2e-4c8a-a9d1-3b4c5d6e3312",
              name: "Jimmy Butler",
              note: "Miami Heat leader known for playoff performances.",
            },
            {
              id: "d2e3f4a5-6b7c-4d8a-b1c2-9e7f6a5b3313",
              name: "Devin Booker",
              note: "Phoenix Suns scoring guard.",
            },
            {
              id: "e7d6c5b4-3a2f-4e9d-b8c1-5a6e7d8c3314",
              name: "Ja Morant",
              note: "Memphis Grizzlies explosive point guard.",
            },
          ],
        },
        {
          id: "7b2e3c4d-9f8e-41c1-bc2a-8e9d2a3f4b5c",
          name: "Street Basketball",
          note: "Pickup games and streetball culture.",
          discoveryKeywords: ["streetball highlights", "and1 mixtape", "pickup basketball"],
          topiccategories: [
            {
              id: "f9c0b8c4-1f6c-48a2-a09b-73e4d2f8b311",
              name: "Rafer Alston (Skip to My Lou)",
              note: "Legendary streetball player who later played in the NBA.",
            },
            {
              id: "1f7d3a4c-5e7c-41a9-b7e2-8d7e1a9b3312",
              name: "Grayson Boucher (The Professor)",
              note: "Famous streetballer from the AND1 Mixtape Tour.",
            },
            {
              id: "ab9fbc34-23e7-4cbb-8d1b-0e1c7d8a3313",
              name: "Troy Jackson (Escalade)",
              note: "Dominant streetball player from the AND1 era.",
            },
            {
              id: "9b1c2d3e-7a8b-4c1d-b9f1-1c2a3d4e3401",
              name: "Philip Champion (Hot Sauce)",
              note: "Streetball legend known for flashy dribbling.",
            },
            {
              id: "8a2d3c4b-1f7e-4d9a-9b3c-7e1a2f4b3402",
              name: "Waliyy Dixon (Main Event)",
              note: "Creative streetball guard from the AND1 tour.",
            },
            {
              id: "4c5d6e7f-2a3b-4d1c-9e8a-1f2b3c4d3403",
              name: "Larry Williams (Bone Collector)",
              note: "Streetball icon famous for ankle-breaking moves.",
            },
            {
              id: "3e2f1a4b-6c7d-4a9e-8c1d-9f2b3a4c3404",
              name: "Brandon Armstrong",
              note: "Streetball entertainer known for NBA player impressions.",
            },
            {
              id: "7c8d9e1a-3b4c-4d2a-8e1f-6a7b8c9d3405",
              name: "Guy Dupuy",
              note: "French dunker famous in streetball dunk contests.",
            },
            {
              id: "2a3b4c5d-6e7f-4d1a-b9c8-1e2f3a4b3406",
              name: "Jordan Kilganon",
              note: "World-famous dunker and streetball performer.",
            },
          ],
        },
      ],
    },
    {
      id: "c5a3d8e7-6d4c-4f3b-a2e1-9b1f3d7a4444",
      name: "Volleyball",
      chummeTraits: "ENTERTAINMENT",
      note: "Volleyball matches, teams, tournaments, and player skills.",
      discoveryKeywords: ["volleyball match", "haikyuu", "volleyball highlights", "beach volleyball"],
      subcategories: [
        {
          id: "ab7e1c2d-4f3a-49c8-bd6e-3e1c2b4f5a6d",
          name: "Indoor Volleyball",
          note: "Traditional indoor volleyball competitions.",
          discoveryKeywords: ["indoor volleyball", "volleyball rotation", "volleyball serve"],
          topiccategories: [
            {
              id: "ce4f2a98-5a33-4b3c-9c2a-4d9f1a7e4411",
              name: "USA Men's National Team",
              note: "Top-level US men’s volleyball team competing internationally.",
            },
            {
              id: "2c6e8a10-0e8f-4b6e-8e4b-9e2d8f7a4412",
              name: "Brazil Women's National Team",
              note: "Dominant Brazilian women's volleyball team.",
            },
            {
              id: "74b8d8a4-5b7d-42b0-9f2c-6a3d2f9e4413",
              name: "Italy Men's Club Teams",
              note: "Top Italian club teams competing in the SuperLega.",
            },
            {
              id: "d1e2c3f4-5b6a-4c7d-9e8f-1a2b3c4d4414",
              name: "Korea Volleyball League Teams",
              note: "Professional indoor volleyball clubs in Korea.",
            },
            {
              id: "b2c3d4e5-6f7a-4b8c-9d1e-2f3a4b5c4415",
              name: "Philippine Super Liga Teams",
              note: "Professional indoor volleyball teams in the Philippines.",
            },
            {
              id: "a1b2c3d4-5e6f-4a7b-8c9d-3e4f5a6b4416",
              name: "Top Players",
              note: "Famous indoor volleyball athletes like Karch Kiraly, Kim Yeon-koung, and Jordan Larson.",
            },
            {
              id: "c1d2e3f4-5a6b-4c7d-8e9f-4b5a6c7d4417",
              name: "Olympic Champions",
              note: "Gold medal-winning volleyball teams from the Olympics.",
            },
          ],
        },
        {
          id: "702b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
          name: "Beach Volleyball",
          note: "Volleyball played on sand courts.",
          discoveryKeywords: ["beach volleyball", "beach volley", "sand volleyball"],
          topiccategories: [
            {
              id: "c4a9f8c1-7a2e-4e52-b1c4-6c4d7b9a12f1",
              name: "FIVB Beach Volleyball World Tour",
              note: "Major international beach volleyball tournament series.",
            },
            {
              id: "9f3e2b77-1f4c-4c9d-8d52-2b6f1f9c0e44",
              name: "Olympic Beach Volleyball",
              note: "Beach volleyball competitions in the Summer Olympics.",
            },
            {
              id: "7b1a0c54-3f9d-45aa-a5a7-58e8d9f2c6b2",
              name: "AVP Pro Beach Tour",
              note: "Professional beach volleyball tour in the USA.",
            },
            {
              id: "a1b2c3d4-5e6f-4a7b-8c9d-1f2a3b4c5d6e",
              name: "Phil Dalhausser",
              note: "Legendary American beach volleyball player, Olympic gold medalist.",
            },
            {
              id: "b2c3d4e5-6f7a-4b8c-9d1e-2f3a4b5c6d7f",
              name: "Kerri Walsh Jennings",
              note: "Iconic female American beach volleyball player.",
            },
            {
              id: "c3d4e5f6-7a8b-4c9d-8e1f-3a2b4c5d6e7f",
              name: "Misty May-Treanor",
              note: "Three-time Olympic gold medalist in beach volleyball.",
            },
            {
              id: "d4e5f6a7-8b9c-4d1e-9f2a-4b3c5d6e7f8a",
              name: "Alison Cerutti",
              note: "Brazilian male beach volleyball star and Olympic medalist.",
            },
            {
              id: "e5f6a7b8-9c0d-4e1f-8a2b-5c6d7e8f9a0b",
              name: "Ágatha Bednarczuk",
              note: "Brazilian female beach volleyball champion.",
            },
            {
              id: "f6a7b8c9-0d1e-4f2a-9b3c-6d7e8f9a0b1c",
              name: "Sarah Pavan",
              note: "Canadian top-level beach volleyball player.",
            },
          ],
        },
      ],
    },
    {
      id: "d3e4f5a6-7b8c-4d9e-af0b-1c2d3e4f5f6e",
      name: "Gaming",
      chummeTraits: "ENTERTAINMENT",
      note: "Video games, streamers, esports tournaments, and gaming communities.",
      discoveryKeywords: ["video games", "gaming", "esports", "twitch", "streamers"],
      subcategories: [
        {
          id: "e1f2a3b4-b5a6-4c7d-8e9f-a1b2c3d4e5f6",
          name: "League of Legends",
          note: "Popular MOBA game by Riot Games.",
          discoveryKeywords: ["league of legends", "lol esports", "faker"],
          topiccategories: [
            {
              id: "f1a2b3c4-d5e6-4a7b-8c9d-012345678901",
              name: "LOL Worlds",
              note: "The annual League of Legends World Championship.",
            },
            {
              id: "a1b2c3d4-e5f6-4a7b-8c9d-012345678902",
              name: "Faker",
              note: "Legendary professional LOL player for T1.",
            },
            {
              id: "b1c2d3e4-f5e6-4a7b-8c9d-012345678903",
              name: "KDA",
              note: "Virtual K-pop girl group based on LOL champions.",
            },
            {
              id: "c1d2e3f4-a5b6-4a7b-8c9d-012345678904",
              name: "LoL Esports",
              note: "Global esports competitions for League of Legends.",
            },
            {
              id: "d1e2f3a4-b5c6-4a7b-8c9d-012345678905",
              name: "Champion Guides",
              note: "Builds, tips, and strategies for LOL champions.",
            },
          ],
        },
      ],
    },
  ] as any[];

  for (const country of communitiesData) {
    const {
      position,
      colorSet,
      sizeSet,
      border,
      shadow,
      opacity,
      capacity,
      status,
      tags,
      emojiIcon,
      ...categoryData
    } = country;

    // 1. Check if category exists
    const existingCategory = await prisma.chummeCategory.findUnique({
      where: { id: categoryData.id },
      include: { chummeVisualDesign: true },
    });

    if (existingCategory) {
      // Update existing
      await prisma.chummeCategory.update({
        where: { id: categoryData.id },
        data: {
          name: categoryData.name,
          isAd: categoryData.isAd,
          keyPassword: categoryData.keyPassword || null,
          chummeTraits: (categoryData.chummeTraits as any) || "NONE",
        },
      });

      if (existingCategory.chummeVisualDesignId) {
        await prisma.chummeCategoryDesign.update({
          where: { id: existingCategory.chummeVisualDesignId },
          data: {
            position,
            colorSet,
            sizeSet,
            border,
            shadow,
            opacity,
            capacity,
            status,
            tags,
            emojiIcon,
          },
        });
      }
    } else {
      // Create new
      const design = await prisma.chummeCategoryDesign.create({
        data: {
          name: `${categoryData.name} Design`,
          position,
          colorSet,
          sizeSet,
          border,
          shadow,
          opacity,
          capacity,
          status,
          tags,
          emojiIcon,
        },
      });

      await prisma.chummeCategory.create({
        data: {
          id: categoryData.id,
          name: categoryData.name,
          isAd: categoryData.isAd ?? false,
          keyPassword: categoryData.keyPassword || null,
          chummeTraits: (categoryData.chummeTraits as any) || "NONE",
          chummeVisualDesignId: design.id,
        },
      });
    }
  }

  console.log(`✅ Seeded ${communitiesData.length} Countries.`);

  // 3. Seed Other Categories
  console.log("🌱 Seeding General Categories...");
  for (const category of categoriesData) {
    const existing = await prisma.chummeCategory.findUnique({
      where: { id: category.id },
    });

    if (existing) {
      await prisma.chummeCategory.update({
        where: { id: category.id },
        data: {
          name: category.name,
          keyPassword: category.keyPassword,
          chummeTraits: (category.chummeTraits as any) || "NONE",
          note: category.note,
          discoveryKeywords: (category as any).discoveryKeywords || [],
        },
      });
    } else {
      await prisma.chummeCategory.create({
        data: {
          id: category.id,
          name: category.name,
          keyPassword: category.keyPassword,
          chummeTraits: (category.chummeTraits as any) || "NONE",
          note: category.note,
          discoveryKeywords: (category as any).discoveryKeywords || [],
        },
      });
    }

    // Seed Subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      for (const sub of category.subcategories) {
        await prisma.chummeSubCategory.upsert({
          where: { id: sub.id },
          update: {
            name: sub.name,
            note: sub.note,
            chummeCategoryId: category.id,
            chummeTraits: (category.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
            discoveryKeywords: (sub as any).discoveryKeywords || [],
          },
          create: {
            id: sub.id,
            name: sub.name,
            note: sub.note,
            chummeCategoryId: category.id,
            chummeTraits: (category.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
            discoveryKeywords: (sub as any).discoveryKeywords || [],
          },
        });

        // Seed Topic Categories (Third level)
        if (sub.topiccategories && sub.topiccategories.length > 0) {
          for (const topic of sub.topiccategories) {
            await prisma.chummeTopicCategory.upsert({
              where: { id: topic.id },
              update: {
                name: topic.name,
                note: topic.note,
                chummeSubCategoryId: sub.id,
                chummeTraits: (category.chummeTraits as any) || "NONE",
                discoveryKeywords: (topic as any).discoveryKeywords || [],
              },
              create: {
                id: topic.id,
                name: topic.name,
                note: topic.note,
                chummeSubCategoryId: sub.id,
                chummeTraits: (category.chummeTraits as any) || "NONE",
                discoveryKeywords: (topic as any).discoveryKeywords || [],
              },
            });
          }
          console.log(
            `✅ Seeded ${sub.topiccategories.length} topic categories for subcategory ${sub.name}`,
          );
        }
      }
      console.log(
        `✅ Seeded ${category.subcategories.length} subcategories for ${category.name}`,
      );
    }
  }

  console.log(`✅ Seeded ${categoriesData.length} General Categories.`);
}
