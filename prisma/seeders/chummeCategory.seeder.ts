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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
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
      chummeTrait: "COMMUNITIES",
    },
  ];

  const categoriesData = [
    {
      id: "7a1c7d6c-2f45-4a9d-9c9e-5a6e7b3c11f2",
      name: "Music",
      chummeTrait: "ENTERTAINMENT",
      note: "Songs, artists, bands, albums, concerts, and music culture.",
      discoveryKeywords: [
        "music trending",
        "new music releases",
        "billboard hot 100",
        "popular music videos",
      ],
      subcategories: [
        {
          id: "5e3f6d8b-21e1-4c79-91aa-0f1b23c3d4e5",
          name: "K-Pop",
          note: "Popular music from South Korean artists and idol groups.",
          discoveryKeywords: [
            "kpop trending",
            "new kpop groups",
            "kpop music show",
            "kpop debut",
          ],
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
              id: "e7b5a4f2-53b5-4b6f-a6e7-3e8a9f20c114",
              name: "TWICE",
              note: "Top-selling K-pop girl group.",
            },
            {
              id: "1aab8a22-4b66-4f5f-9e51-6f2f9f93c113",
              name: "EXO",
              note: "K-pop boy group known for powerful vocals.",
            },
            {
              id: "6a3b8c01-5c4d-4c51-8e90-9c10b3f21202",
              name: "Stray Kids",
              note: "4th generation K-pop boy group.",
            },
            {
              id: "0c1a2d33-8c11-4c71-b1f0-6f2d1f221201",
              name: "SEVENTEEN",
              note: "Self-producing K-pop boy group.",
            },
            {
              id: "8e9c1b77-0d13-49d3-9f10-2b7b9a1f1207",
              name: "ENHYPEN",
              note: "K-pop boy group formed through I-LAND.",
            },
            {
              id: "1c92a3f0-7e44-4d55-bc1e-0a1d332a1203",
              name: "NCT 127",
              note: "Seoul-based NCT unit.",
            },
            {
              id: "a7f1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
              name: "NCT DREAM",
              note: "Youth-focused NCT unit.",
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
          ],
        },
        {
          id: "b8c9d0e1-f2a3-4b4c-5d6e-f7a8b9c0d1e2",
          name: "J-Pop",
          note: "Japanese pop music, idol groups, and artists.",
          discoveryKeywords: [
            "jpop music",
            "japanese pop",
            "arashi",
            "nogizaka46",
          ],
          topiccategories: [
            {
              id: "c9d0e1f2-a3b4-4c5d-6e7f-a8b9c0d1e2f3",
              name: "Arashi",
              note: "Legendary Japanese boy band.",
            },
            {
              id: "d0e1f2a3-b4c5-4d6e-7f8a-b9c0d1e2f3a4",
              name: "Nogizaka46",
              note: "Top-tier Japanese idol group.",
            },
            {
              id: "e1f2a3b4-c5d6-4e7f-8a9b-c0d1e2f3a4b5",
              name: "AKB48",
              note: "Iconic Japanese idol group.",
            },
            {
              id: "f2a3b4c5-d6e7-4f8a-9b0c-d1e2f3a4b5c6",
              name: "King & Prince",
              note: "Japanese pop duo and idol group.",
            },
            {
              id: "a3b4c5d6-e7f8-4a9b-0c1d-e2f3a4b5c6d7",
              name: "JO1",
              note: "Japanese boy group formed through Produce 101.",
            },
            {
              id: "b4c5d6e7-f8a9-4b0c-1d2e-f3a4b5c6d7e8",
              name: "Perfume",
              note: "Japanese electropop trio.",
            },
            {
              id: "c5d6e7f8-a9b0-4c1d-2e3f-a4b5c6d7e8f9",
              name: "EXILE",
              note: "Japanese R&B and dance group.",
            },
          ],
        },
        {
          id: "d6e7f8a9-b0c1-4d2e-3f4a-b5c6d7e8f9a0",
          name: "C-Pop (Mandopop / Cantopop)",
          note: "Chinese pop music including Mandopop and Cantopop.",
          discoveryKeywords: ["cpop music", "mandopop", "cantopop", "jay chou"],
          topiccategories: [
            {
              id: "e7f8a9b0-c1d2-4e3f-4a5b-c6d7e8f9a0b1",
              name: "Jay Chou",
              note: "King of Mandopop.",
            },
            {
              id: "f8a9b0c1-d2e3-4f4a-5b6c-d7e8f9a0b1c2",
              name: "JJ Lin",
              note: "Singaporean Mandopop singer-songwriter.",
            },
            {
              id: "a9b0c1d2-e3f4-4a5b-6c7d-e8f9a0b1c2d3",
              name: "TFBOYS",
              note: "Chinese boy band trio.",
            },
            {
              id: "b0c1d2e3-f4a5-4b6c-7d8e-f9a0b1c2d3e4",
              name: "WayV",
              note: "NCT's China-based subunit.",
            },
            {
              id: "c1d2e3f4-a5b6-4c7d-8e9f-a0b1c2d3e4f5",
              name: "G.E.M.",
              note: "Cantopop superstar.",
            },
            {
              id: "d2e3f4a5-b6c7-4d8e-9f0a-b1c2d3e4f5a6",
              name: "Mayday (五月天)",
              note: "Taiwanese rock band.",
            },
            {
              id: "e3f4a5b6-c7d8-4e9f-0a1b-c2d3e4f5a6b7",
              name: "Eason Chan",
              note: "Cantopop legend.",
            },
          ],
        },
        {
          id: "f4a5b6c7-d8e9-4f0a-1b2c-d3e4f5a6b7c8",
          name: "OPM (Philippines)",
          note: "Original Pilipino Music — local Filipino artists and bands.",
          discoveryKeywords: [
            "opm music",
            "filipino music",
            "sb19",
            "bini",
            "oph artists",
          ],
          topiccategories: [
            {
              id: "a5b6c7d8-e9f0-4a1b-2c3d-e4f5a6b7c8d9",
              name: "SB19",
              note: "Filipino P-pop boy group.",
            },
            {
              id: "b6c7d8e9-f0a1-4b2c-3d4e-f5a6b7c8d9e0",
              name: "BINI",
              note: "Filipino girl group.",
            },
            {
              id: "c7d8e9f0-a1b2-4c3d-4e5f-a6b7c8d9e0f1",
              name: "BGYO",
              note: "Filipino boy group.",
            },
            {
              id: "d8e9f0a1-b2c3-4d4e-5f6a-b7c8d9e0f1a2",
              name: "MNL48",
              note: "Philippine franchise of AKB48.",
            },
            {
              id: "e9f0a1b2-c3d4-4e5f-6a7b-c8d9e0f1a2b3",
              name: "ALAMAT",
              note: "Filipino boy group promoting culture.",
            },
            {
              id: "f0a1b2c3-d4e5-4f6a-7b8c-d9e0f1a2b3c4",
              name: "KAIA",
              note: "Filipino girl group.",
            },
            {
              id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
              name: "1st.One PH",
              note: "Filipino idol group.",
            },
            {
              id: "b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6",
              name: "Ben&Ben",
              note: "Filipino folk pop band.",
            },
            {
              id: "c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7",
              name: "December Avenue",
              note: "Filipino rock band.",
            },
            {
              id: "d4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8",
              name: "Moira Dela Torre",
              note: "Filipino singer-songwriter.",
            },
            {
              id: "e5f6a7b8-c9d0-4e1f-2a3b-c4d5e6f7a8b9",
              name: "IV of Spades",
              note: "Filipino funk pop band.",
            },
            {
              id: "f6a7b8c9-d0e1-4f2a-3b4c-d5e6f7a8b9c0",
              name: "Dilaw",
              note: "Filipino OPM artist.",
            },
            {
              id: "a7b8c9d0-e1f2-4a3b-4c5d-e6f7a8b9c0d1",
              name: "Adie",
              note: "Filipino singer-songwriter.",
            },
            {
              id: "b8c9d0e1-f2a3-4b4c-5d6e-f7a8b9c0d1e2",
              name: "Sponge Cola",
              note: "Filipino pop rock band.",
            },
            {
              id: "c9d0e1f2-a3b4-4c5d-6e7f-a8b9c0d1e2f3",
              name: "Silent Sanctuary",
              note: "Filipino alternative band.",
            },
            {
              id: "d0e1f2a3-b4c5-4d6e-7f8a-b9c0d1e2f3a4",
              name: "Autotelic",
              note: "Filipino indie pop band.",
            },
          ],
        },
        {
          id: "e1f2a3b4-c5d6-4e7f-8a9b-c0d1e2f3a4b5",
          name: "Asian Hip-Hop / R&B",
          note: "Asian hip-hop and R&B artists.",
          discoveryKeywords: ["asian hiphop", "rich brian", "niki", "jay park"],
          topiccategories: [
            {
              id: "f2a3b4c5-d6e7-4f8a-9b0c-d1e2f3a4b5c6",
              name: "Rich Brian",
              note: "Indonesian rapper signed to 88rising.",
            },
            {
              id: "a3b4c5d6-e7f8-4a9b-0c1d-e2f3a4b5c6d7",
              name: "NIKI",
              note: "Indonesian singer-songwriter under 88rising.",
            },
            {
              id: "b4c5d6e7-f8a9-4b0c-1d2e-f3a4b5c6d7e8",
              name: "Higher Brothers",
              note: "Chinese hip-hop group.",
            },
            {
              id: "c5d6e7f8-a9b0-4c1d-2e3f-a4b5c6d7e8f9",
              name: "Jay Park",
              note: "Korean-American rapper and label founder.",
            },
            {
              id: "d6e7f8a9-b0c1-4d2e-3f4a-b5c6d7e8f9a0",
              name: "Keith Ape",
              note: "Korean rapper known for It G Ma.",
            },
            {
              id: "e7f8a9b0-c1d2-4e3f-4a5b-c6d7e8f9a0b1",
              name: "ØZI",
              note: "Taiwanese R&B artist.",
            },
          ],
        },
        {
          id: "f8a9b0c1-d2e3-4f4a-5b6c-d7e8f9a0b1c2",
          name: "Asian Indie / Alternative",
          note: "Asian indie and alternative music artists.",
          discoveryKeywords: [
            "asian indie music",
            "asian alternative",
            "the sam willows",
          ],
          topiccategories: [
            {
              id: "a9b0c1d2-e3f4-4a5b-6c7d-e8f9a0b1c2d3",
              name: "The Sam Willows",
              note: "Singaporean indie pop band.",
            },
            {
              id: "b0c1d2e3-f4a5-4b6c-7d8e-f9a0b1c2d3e4",
              name: "Secret Number",
              note: "Multinational girl group.",
            },
            {
              id: "c1d2e3f4-a5b6-4c7d-8e9f-a0b1c2d3e4f5",
              name: "Say Sue Me",
              note: "South Korean indie band.",
            },
            {
              id: "d2e3f4a5-b6c7-4d8e-9f0a-b1c2d3e4f5a6",
              name: "Mighty Mighty",
              note: "Asian indie music collective.",
            },
          ],
        },
        {
          id: "e3f4a5b6-c7d8-4e9f-0a1b-c2d3e4f5a6b7",
          name: "Asian EDM / Dance",
          note: "Asian electronic and dance music.",
          discoveryKeywords: ["asian edm", "alan walker", "dj soda", "zedd"],
          topiccategories: [
            {
              id: "f4a5b6c7-d8e9-4f0a-1b2c-d3e4f5a6b7c8",
              name: "Alan Walker",
              note: "Norwegian-born DJ popular in Asia.",
            },
            {
              id: "a5b6c7d8-e9f0-4a1b-2c3d-e4f5a6b7c8d9",
              name: "Zedd",
              note: "Russian-German DJ and record producer.",
            },
            {
              id: "b6c7d8e9-f0a1-4b2c-3d4e-f5a6b7c8d9e0",
              name: "DJ Soda",
              note: "South Korean DJ and internet celebrity.",
            },
            {
              id: "c7d8e9f0-a1b2-4c3d-4e5f-a6b7c8d9e0f1",
              name: "Pegboard Nerds",
              note: "Norwegian electronic music duo.",
            },
          ],
        },
      ],
    },
    {
      id: "d6a7b8c9-e0f1-4a2b-3c4d-f5a6b7c8d9e0",
      name: "Sports",
      chummeTrait: "ENTERTAINMENT",
      note: "Sports events, teams, athletes, and competitions.",
      discoveryKeywords: [
        "sports news",
        "sports highlights",
        "live sports",
        "athletes",
      ],
      subcategories: [
        {
          id: "a5c9c3d8-4b33-4c92-9c6b-1a0d9e7b3333",
          name: "Basketball",
          note: "Basketball leagues, teams, and players across Asia.",
          discoveryKeywords: [
            "basketball highlights",
            "pba",
            "nba",
            "basketball asia",
          ],
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
              id: "d8e9f0a1-b2c3-4d4e-5f6a-b7c8d9e0f1a2",
              name: "Barangay Ginebra San Miguel",
              note: "Iconic PBA team in the Philippines.",
            },
            {
              id: "e9f0a1b2-c3d4-4e5f-6a7b-c8d9e0f1a2b3",
              name: "San Miguel Beermen",
              note: "Most decorated PBA franchise.",
            },
            {
              id: "f0a1b2c3-d4e5-4f6a-7b8c-d9e0f1a2b3c4",
              name: "TNT Tropang Giga",
              note: "PBA championship contender.",
            },
            {
              id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
              name: "Guangdong Southern Tigers",
              note: "Dominant CBA team in China.",
            },
            {
              id: "b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6",
              name: "Liaoning Flying Leopards",
              note: "Top CBA franchise.",
            },
            {
              id: "c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7",
              name: "Zhejiang Golden Bulls",
              note: "CBA basketball team.",
            },
            {
              id: "d4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8",
              name: "Seoul SK Knights",
              note: "KBL team in South Korea.",
            },
            {
              id: "e5f6a7b8-c9d0-4e1f-2a3b-c4d5e6f7a8b9",
              name: "Ulsan Hyundai Mobis Phoebus",
              note: "KBL team in South Korea.",
            },
            {
              id: "f6a7b8c9-d0e1-4f2a-3b4c-d5e6f7a8b9c0",
              name: "Ateneo Blue Eagles",
              note: "UAAP college basketball powerhouse.",
            },
            {
              id: "a7b8c9d0-e1f2-4a3b-4c5d-e6f7a8b9c0d1",
              name: "De La Salle Green Archers",
              note: "UAAP college basketball rival.",
            },
            {
              id: "b8c9d0e1-f2a3-4b4c-5d6e-f7a8b9c0d1e2",
              name: "FEU Tamaraws",
              note: "UAAP college basketball team.",
            },
            {
              id: "c9d0e1f2-a3b4-4c5d-6e7f-a8b9c0d1e2f3",
              name: "NU Bulldogs",
              note: "UAAP college basketball team.",
            },
          ],
        },
        {
          id: "a9d0e1f2-b3c4-4d5e-6f7a-c8d9e0f1a2b3",
          name: "Football (Soccer)",
          note: "Football leagues and teams across Asia.",
          discoveryKeywords: [
            "football asia",
            "j1 league",
            "k league",
            "asian football",
          ],
          topiccategories: [
            {
              id: "b0e1f2a3-c4d5-4e6f-7a8b-d9e0f1a2b3c4",
              name: "Kawasaki Frontale",
              note: "J1 League powerhouse in Japan.",
            },
            {
              id: "c1f2a3b4-d5e6-4f7a-8b9c-e0f1a2b3c4d5",
              name: "Urawa Red Diamonds",
              note: "J1 League club with passionate fanbase.",
            },
            {
              id: "d2a3b4c5-e6f7-4a8b-9c0d-f1a2b3c4d5e6",
              name: "Shonan Bellmare",
              note: "J1 League football club.",
            },
            {
              id: "e3b4c5d6-f7a8-4b9c-0d1e-a2b3c4d5e6f7",
              name: "Jeonbuk Hyundai Motors",
              note: "Dominant K League 1 club.",
            },
            {
              id: "f4c5d6e7-a8b9-4c0d-1e2f-b3c4d5e6f7a8",
              name: "FC Seoul",
              note: "Top K League 1 club.",
            },
            {
              id: "a5d6e7f8-b9c0-4d1e-2f3a-c4d5e6f7a8b9",
              name: "Suwon Samsung Bluewings",
              note: "K League 1 football club.",
            },
            {
              id: "b6e7f8a9-c0d1-4e2f-3a4b-d5e6f7a8b9c0",
              name: "Guangzhou FC",
              note: "Chinese Super League club.",
            },
            {
              id: "c7f8a9b0-d1e2-4f3a-4b5c-e6f7a8b9c0d1",
              name: "Shanghai Port",
              note: "Chinese Super League top club.",
            },
            {
              id: "d8a9b0c1-e2f3-4a4b-5c6d-f7a8b9c0d1e2",
              name: "Shanghai Shenhua",
              note: "Chinese Super League football club.",
            },
            {
              id: "e9b0c1d2-f3a4-4b5c-6d7e-a8b9c0d1e2f3",
              name: "Azkals",
              note: "Philippines national football team.",
            },
            {
              id: "f0c1d2e3-a4b5-4c6d-7e8f-b9c0d1e2f3a4",
              name: "Ceres-Negros FC",
              note: "Philippine Football League club.",
            },
            {
              id: "a1d2e3f4-b5c6-4d7e-8f9a-c0d1e2f3a4b5",
              name: "United City FC",
              note: "Philippine Football League champion.",
            },
            {
              id: "b2e3f4a5-c6d7-4e8f-9a0b-d1e2f3a4b5c6",
              name: "Japan National Team",
              note: "Samurai Blue — Asian football powerhouse.",
            },
            {
              id: "c3f4a5b6-d7e8-4f9a-0b1c-e2f3a4b5c6d7",
              name: "South Korea National Team",
              note: "Asian football giant.",
            },
            {
              id: "d4a5b6c7-e8f9-4a0b-1c2d-f3a4b5c6d7e8",
              name: "China National Team",
              note: "Chinese national football team.",
            },
            {
              id: "e5b6c7d8-f9a0-4b1c-2d3e-a4b5c6d7e8f9",
              name: "Philippines National Team",
              note: "Azkals Philippine national team.",
            },
          ],
        },
        {
          id: "c5a3d8e7-6d4c-4f3b-a2e1-9b1f3d7a4444",
          name: "Volleyball",
          note: "Volleyball leagues and teams across Asia.",
          discoveryKeywords: [
            "volleyball asia",
            "pvl",
            "v league",
            "kovo",
            "philippine volleyball",
          ],
          topiccategories: [
            {
              id: "ce4f2a98-5a33-4b3c-9c2a-4d9f1a7e4411",
              name: "Toray Arrows",
              note: "V.League women's volleyball team in Japan.",
            },
            {
              id: "2c6e8a10-0e8f-4b6e-8e4b-9e2d8f7a4412",
              name: "JT Thunders",
              note: "V.League volleyball club in Japan.",
            },
            {
              id: "74b8d8a4-5b7d-42b0-9f2c-6a3d2f9e4413",
              name: "Cheonan Hyundai Capital Skywalkers",
              note: "KOVO League men's volleyball team.",
            },
            {
              id: "d1e2c3f4-5b6a-4c7d-9e8f-1a2b3c4d4414",
              name: "Incheon Korean Air Jumbos",
              note: "KOVO League volleyball team.",
            },
            {
              id: "b2c3d4e5-6f7a-4b8c-9d1e-2f3a4b5c4415",
              name: "Creamline Cool Smashers",
              note: "PVL dominant women's volleyball team in the Philippines.",
            },
            {
              id: "a1b2c3d4-5e6f-4a7b-8c9d-3e4f5a6b4416",
              name: "Petro Gazz Angels",
              note: "PVL women's volleyball team.",
            },
            {
              id: "c1d2e3f4-5a6b-4c7d-8e9f-4b5a6c7d4417",
              name: "F2 Logistics Cargo Movers",
              note: "PVL women's volleyball team.",
            },
          ],
        },
        {
          id: "f6c7d8e9-a0b1-4c2d-3e4f-b5c6d7e8f9a0",
          name: "Baseball",
          note: "Baseball leagues and teams across Asia.",
          discoveryKeywords: [
            "baseball asia",
            "npb",
            "kbo",
            "cpbl",
            "japanese baseball",
          ],
          topiccategories: [
            {
              id: "a7d8e9f0-b1c2-4d3e-4f5a-c6d7e8f9a0b1",
              name: "Yomiuri Giants",
              note: "Most decorated NPB team in Japan.",
            },
            {
              id: "b8e9f0a1-c2d3-4e4f-5a6b-d7e8f9a0b1c2",
              name: "Hanshin Tigers",
              note: "Iconic NPB team with passionate fanbase.",
            },
            {
              id: "c9f0a1b2-d3e4-4f5a-6b7c-e8f9a0b1c2d3",
              name: "Fukuoka SoftBank Hawks",
              note: "NPB powerhouse franchise.",
            },
            {
              id: "d0a1b2c3-e4f5-4a6b-7c8d-f9a0b1c2d3e4",
              name: "Doosan Bears",
              note: "KBO League team in South Korea.",
            },
            {
              id: "e1b2c3d4-f5a6-4b7c-8d9e-a0b1c2d3e4f5",
              name: "Samsung Lions",
              note: "KBO League team in South Korea.",
            },
            {
              id: "f2c3d4e5-a6b7-4c8d-9e0f-b1c2d3e4f5a6",
              name: "Rakuten Monkeys",
              note: "CPBL team in Taiwan.",
            },
            {
              id: "a3d4e5f6-b7c8-4d9e-0f1a-c2d3e4f5a6b7",
              name: "Uni-President Lions",
              note: "CPBL team in Taiwan.",
            },
          ],
        },
        {
          id: "b4e5f6a7-c8d9-4e0f-1a2b-d3e4f5a6b7c8",
          name: "Cricket",
          note: "Cricket leagues, teams, and players in Asia.",
          discoveryKeywords: [
            "cricket asia",
            "ipl",
            "psl",
            "indian premier league",
          ],
          topiccategories: [
            {
              id: "c5f6a7b8-d9e0-4f1a-2b3c-e4f5a6b7c8d9",
              name: "Mumbai Indians",
              note: "IPL's most successful franchise.",
            },
            {
              id: "d6a7b8c9-e0f1-4a2b-3c4d-f5a6b7c8d9e0",
              name: "Chennai Super Kings",
              note: "IPL powerhouse led by MS Dhoni.",
            },
            {
              id: "e7b8c9d0-f1a2-4b3c-4d5e-a6b7c8d9e0f1",
              name: "Royal Challengers Bangalore",
              note: "IPL team featuring top stars.",
            },
            {
              id: "f8c9d0e1-a2b3-4c4d-5e6f-b7c8d9e0f1a2",
              name: "Karachi Kings",
              note: "PSL team in Pakistan.",
            },
            {
              id: "a9d0e1f2-b3c4-4d5e-6f7a-c8d9e0f1a2b3",
              name: "Lahore Qalandars",
              note: "PSL champions in Pakistan.",
            },
            {
              id: "b0e1f2a3-c4d5-4e6f-7a8b-d9e0f1a2b3c4",
              name: "Dhaka Dynamites",
              note: "Bangladesh Premier League team.",
            },
          ],
        },
        {
          id: "c1f2a3b4-d5e6-4f7a-8b9c-e0f1a2b3c4d5",
          name: "Ice Hockey",
          note: "Ice hockey teams and leagues in Asia.",
          discoveryKeywords: [
            "ice hockey asia",
            "asia league ice hockey",
            "anyang halla",
          ],
          topiccategories: [
            {
              id: "d2a3b4c5-e6f7-4a8b-9c0d-f1a2b3c4d5e6",
              name: "Anyang Halla",
              note: "South Korean ice hockey team.",
            },
            {
              id: "e3b4c5d6-f7a8-4b9c-0d1e-a2b3c4d5e6f7",
              name: "Nippon Paper Cranes",
              note: "Japanese ice hockey club.",
            },
            {
              id: "f4c5d6e7-a8b9-4c0d-1e2f-b3c4d5e6f7a8",
              name: "Oji Eagles",
              note: "Japanese ice hockey team.",
            },
          ],
        },
      ],
    },
    {
      id: "f8c9d0e1-a2b3-4c4d-5e6f-b7c8d9e0f1a2",
      name: "E-Sports",
      chummeTrait: "ENTERTAINMENT",
      note: "Competitive gaming, esports tournaments, and gaming communities.",
      discoveryKeywords: [
        "esports",
        "competitive gaming",
        "gaming tournaments",
        "twitch",
      ],
      subcategories: [
        {
          id: "d3e4f5a6-7b8c-4d9e-af0b-1c2d3e4f5f6e",
          name: "MOBA",
          note: "Multiplayer online battle arena games.",
          discoveryKeywords: [
            "moba games",
            "league of legends",
            "dota 2",
            "mobile legends",
          ],
          topiccategories: [
            {
              id: "f1a2b3c4-d5e6-4a7b-8c9d-012345678901",
              name: "T1",
              note: "Legendary LoL team home of Faker.",
            },
            {
              id: "a1b2c3d4-e5f6-4a7b-8c9d-012345678902",
              name: "Gen.G",
              note: "Top Korean LoL esports org.",
            },
            {
              id: "b1c2d3e4-f5e6-4a7b-8c9d-012345678903",
              name: "DWG KIA",
              note: "Multiple LoL world champions.",
            },
            {
              id: "c1d2e3f4-a5b6-4a7b-8c9d-012345678904",
              name: "LNG Esports",
              note: "Chinese LoL team.",
            },
            {
              id: "d1e2f3a4-b5c6-4a7b-8c9d-012345678905",
              name: "Royal Never Give Up",
              note: "Chinese LoL powerhouse.",
            },
            {
              id: "a5b6c7d8-e9f0-4a1b-2c3d-e4f5a6b7c8d9",
              name: "Edward Gaming",
              note: "LoL World Champions 2021.",
            },
            {
              id: "b6c7d8e9-f0a1-4b2c-3d4e-f5a6b7c8d9e0",
              name: "Team Secret",
              note: "Dota 2 top tier team.",
            },
            {
              id: "c7d8e9f0-a1b2-4c3d-4e5f-a6b7c8d9e0f1",
              name: "PSG.LGD",
              note: "Chinese Dota 2 team.",
            },
            {
              id: "d8e9f0a1-b2c3-4d4e-5f6a-b7c8d9e0f1a2",
              name: "Team Aster",
              note: "Chinese Dota 2 team.",
            },
            {
              id: "e9f0a1b2-c3d4-4e5f-6a7b-c8d9e0f1a2b3",
              name: "Fnatic",
              note: "European org with Dota 2 and LoL teams.",
            },
            {
              id: "f0a1b2c3-d4e5-4f6a-7b8c-d9e0f1a2b3c4",
              name: "TNC Predator",
              note: "Southeast Asian Dota 2 team.",
            },
            {
              id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
              name: "Bren Esports",
              note: "MLBB World Champions from the Philippines.",
            },
            {
              id: "b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6",
              name: "ONIC Philippines",
              note: "Top MLBB team in the Philippines.",
            },
            {
              id: "c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7",
              name: "EVOS Legends",
              note: "Indonesian MLBB powerhouse.",
            },
            {
              id: "d4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8",
              name: "RSG Philippines",
              note: "MLBB team from the Philippines.",
            },
            {
              id: "e5f6a7b8-c9d0-4e1f-2a3b-c4d5e6f7a8b9",
              name: "AHQ eSports Club",
              note: "Arena of Valor team.",
            },
            {
              id: "f6a7b8c9-d0e1-4f2a-3b4c-d5e6f7a8b9c0",
              name: "Talon Esports",
              note: "Southeast Asian esports org.",
            },
            {
              id: "a7b8c9d0-e1f2-4a3b-4c5d-e6f7a8b9c0d1",
              name: "Team Flash",
              note: "Arena of Valor championship team.",
            },
          ],
        },
        {
          id: "a9b0c1d2-e3f4-4a5b-6c7d-e8f9a0b1c2d3",
          name: "FPS (First-Person Shooter)",
          note: "First-person shooter esports games.",
          discoveryKeywords: [
            "fps games",
            "valorant",
            "counter-strike",
            "point blank",
          ],
          topiccategories: [
            {
              id: "b0c1d2e3-f4a5-4b6c-7d8e-f9a0b1c2d3e4",
              name: "Paper Rex",
              note: "Singapore Valorant team.",
            },
            {
              id: "c1d2e3f4-a5b6-4c7d-8e9f-a0b1c2d3e4f5",
              name: "NUTURN Gaming",
              note: "South Korean Valorant team.",
            },
            {
              id: "d2e3f4a5-b6c7-4d8e-9f0a-b1c2d3e4f5a6",
              name: "Gen.G Esports",
              note: "Korean Valorant squad.",
            },
            {
              id: "e3f4a5b6-c7d8-4e9f-0a1b-c2d3e4f5a6b7",
              name: "FAV Gaming",
              note: "Japanese Valorant team.",
            },
            {
              id: "f4a5b6c7-d8e9-4f0a-1b2c-d3e4f5a6b7c8",
              name: "TYLOO",
              note: "Chinese CS2 team.",
            },
            {
              id: "a5b6c7d8-e9f0-4a1b-2c3d-e4f5a6b7c8d9",
              name: "ViCi Gaming",
              note: "Chinese CS2 esports org.",
            },
            {
              id: "b6c7d8e9-f0a1-4b2c-3d4e-f5a6b7c8d9e0",
              name: "5POWER",
              note: "Chinese Counter-Strike team.",
            },
            {
              id: "c7d8e9f0-a1b2-4c3d-4e5f-a6b7c8d9e0f1",
              name: "Cloud9",
              note: "International CS2 organization.",
            },
            {
              id: "d8e9f0a1-b2c3-4d4e-5f6a-b7c8d9e0f1a2",
              name: "PBIC",
              note: "Point Blank International Championship.",
            },
            {
              id: "e9f0a1b2-c3d4-4e5f-6a7b-c8d9e0f1a2b3",
              name: "Team Chemin",
              note: "Point Blank competitive team.",
            },
          ],
        },
        {
          id: "f4a5b6c7-d8e9-4f0a-1b2c-d3e4f5a6b7c8",
          name: "Battle Royale",
          note: "Battle royale games and competitive scene.",
          discoveryKeywords: [
            "battle royale",
            "pubg mobile",
            "free fire",
            "call of duty mobile",
          ],
          topiccategories: [
            {
              id: "a5b6c7d8-e9f0-4a1b-2c3d-e4f5a6b7c8d9",
              name: "RRQ Athena",
              note: "PUBG Mobile team from Indonesia.",
            },
            {
              id: "b6c7d8e9-f0a1-4b2c-3d4e-f5a6b7c8d9e0",
              name: "Bigetron RA",
              note: "PUBG Mobile esports team.",
            },
            {
              id: "c7d8e9f0-a1b2-4c3d-4e5f-a6b7c8d9e0f1",
              name: "D'Xavier",
              note: "PUBG Mobile competitive team.",
            },
            {
              id: "d8e9f0a1-b2c3-4d4e-5f6a-b7c8d9e0f1a2",
              name: "MVP PK",
              note: "PUBG Mobile team.",
            },
            {
              id: "e9f0a1b2-c3d4-4e5f-6a7b-c8d9e0f1a2b3",
              name: "EVOS Esports",
              note: "Free Fire powerhouse from SEA.",
            },
            {
              id: "f0a1b2c3-d4e5-4f6a-7b8c-d9e0f1a2b3c4",
              name: "RRQ Hades",
              note: "Free Fire team from Indonesia.",
            },
            {
              id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
              name: "ALMGHTY Esports",
              note: "Free Fire competitive team.",
            },
            {
              id: "b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6",
              name: "BOOM Esports",
              note: "Southeast Asian multi-game esports org.",
            },
            {
              id: "c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7",
              name: "GodLike Esports",
              note: "Call of Duty Mobile team from India.",
            },
            {
              id: "d4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8",
              name: "Team IND",
              note: "Indian Call of Duty Mobile team.",
            },
            {
              id: "e5f6a7b8-c9d0-4e1f-2a3b-c4d5e6f7a8b9",
              name: "GS Esports",
              note: "Call of Duty Mobile competitive team.",
            },
          ],
        },
        {
          id: "f6a7b8c9-d0e1-4f2a-3b4c-d5e6f7a8b9c0",
          name: "Fighting Games",
          note: "Competitive fighting games and tournaments.",
          discoveryKeywords: [
            "fighting games",
            "tekken",
            "street fighter",
            "evo championship",
          ],
          topiccategories: [
            {
              id: "a7b8c9d0-e1f2-4a3b-4c5d-e6f7a8b9c0d1",
              name: "Daigo Umehara",
              note: "Street Fighter legend known as The Beast.",
            },
            {
              id: "b8c9d0e1-f2a3-4b4c-5d6e-f7a8b9c0d1e2",
              name: "SonicFox",
              note: "Multi-game fighting champion.",
            },
            {
              id: "c9d0e1f2-a3b4-4c5d-6e7f-a8b9c0d1e2f3",
              name: "Knee",
              note: "Legendary Tekken player from South Korea.",
            },
            {
              id: "d0e1f2a3-b4c5-4d6e-7f8a-b9c0d1e2f3a4",
              name: "JDCR",
              note: "Top Tekken competitor.",
            },
            {
              id: "e1f2a3b4-c5d6-4e7f-8a9b-c0d1e2f3a4b5",
              name: "Anakin",
              note: "Top Tekken 7 competitor.",
            },
            {
              id: "f2a3b4c5-d6e7-4f8a-9b0c-d1e2f3a4b5c6",
              name: "Maister",
              note: "Top Super Smash Bros player.",
            },
            {
              id: "a3b4c5d6-e7f8-4a9b-0c1d-e2f3a4b5c6d7",
              name: "Tweek",
              note: "Super Smash Bros competitive player.",
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
          chummeTrait: (categoryData.chummeTrait as any) || "NONE",
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
          chummeTrait: (categoryData.chummeTrait as any) || "NONE",
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
          chummeTrait: (category.chummeTrait as any) || "NONE",
          note: category.note,
          // Intentionally omitting discoveryKeywords on update to preserve dynamic DB data
        },
      });
    } else {
      await prisma.chummeCategory.create({
        data: {
          id: category.id,
          name: category.name,
          keyPassword: category.keyPassword,
          chummeTrait: (category.chummeTrait as any) || "NONE",
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
            chummeTrait: (category.chummeTrait as any) || "NONE",
            ownerId: systemUser.id,
            // Intentionally omitting discoveryKeywords on update to preserve dynamic DB data
          },
          create: {
            id: sub.id,
            name: sub.name,
            note: sub.note,
            chummeCategoryId: category.id,
            chummeTrait: (category.chummeTrait as any) || "NONE",
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
                chummeTrait: (category.chummeTrait as any) || "NONE",
                // Intentionally omitting discoveryKeywords on update to preserve dynamic DB data
              },
              create: {
                id: topic.id,
                name: topic.name,
                note: topic.note,
                chummeSubCategoryId: sub.id,
                chummeTrait: (category.chummeTrait as any) || "NONE",
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
