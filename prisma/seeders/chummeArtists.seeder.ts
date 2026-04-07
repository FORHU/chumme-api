import { PrismaClient } from "@prisma/client";

export async function seedArtists(prisma: PrismaClient) {
  console.log("🌱 Seeding Consolidated & Complete Artist List...");

  const artistsData = [
    {
      "id": "9cab6457-e586-4312-9351-93fb04262409",
      "name": "Others....",
      "bio": "Freelance Artist",
      "imageUrl": "",
      "platform": "YOUTUBE",
      "channelId": [],
      "isDraft": true,
      "socialPlatformUsername": ""
    },
    {
      "id": "a123bc45-e89b-12d3-a456-426614174000",
      "name": "Draft Testing Artist",
      "bio": "System generated artist used solely to test isDraft=true query exclusions filters setups.",
      "imageUrl": "",
      "platform": "YOUTUBE",
      "channelId": [],
      "isDraft": true,
      "socialPlatformUsername": ""
    },
    {
      "id": "c92efa7e-f38e-4798-b12f-6d932c690720",
      "name": "BTS",
      "bio": "7-member boy group from Big Hit Music, global superstars known for \"Dynamite\", \"Butter\", and \"Spring Day\"",
      "imageUrl": "https://d1lq91nbxprxl1.cloudfront.net/uploads/BTSLogo.png",
      "platform": "TIKTOK",
      "channelId": [
        "UCLkAepWjdylmXSltofFvsYQ"
      ],
      "isDraft": false,
      "socialPlatformUsername": "bts_official_bighit"
    },
    {
      "id": "e272b36b-4368-4c66-a0d7-c19645d0615c",
      "name": "Stray Kids",
      "bio": "Auto-generated from Topic Category: Stray Kids",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UC9rMiEjNaCSsebs31MRDCRA"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "f8818235-b033-4882-a22d-3c6e677c0fa1",
      "name": "Exo",
      "bio": "South Korean-Chinese boy band based in Seoul formed by SM Entertainment in 2011 and debuted in 2012. The group consists of nine members",
      "imageUrl": "",
      "platform": "YOUTUBE",
      "channelId": [
        "UCzCedBCSSltI1TFd3bKyN6g"
      ],
      "isDraft": false,
      "socialPlatformUsername": ""
    },
    {
      "id": "ccbcffbd-7cb3-4f8b-b623-822011c42945",
      "name": "aespa",
      "bio": "Auto-generated from Topic Category: aespa",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UC9GtSLeksfK4yuJ_g1lgQbg"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "02c1b615-5312-419d-83a7-d880f0f5ae76",
      "name": "ITZY",
      "bio": "Auto-generated from Topic Category: ITZY",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCDhM2k2Cua-JdobAh5moMFg"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "0165bb0f-3ebc-432c-8486-30c492e56861",
      "name": "LE SSERAFIM",
      "bio": "Auto-generated from Topic Category: LE SSERAFIM",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCs-QBT4qkj_YiQw1ZntDO3g"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "bb7675cc-3b6b-4a58-bde0-f733955a99d9",
      "name": "IVE",
      "bio": "Auto-generated from Topic Category: IVE",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UC-Fnix71vRP64WXeo0ikd0Q"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "f3c34717-90ce-49d8-9286-91388fbf3499",
      "name": "(G)I-DLE",
      "bio": "Auto-generated from Topic Category: (G)I-DLE",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCritGVo7pLJLUS8wEu32vow"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "e3f9088f-9f83-4330-8c2f-24ad16ebd136",
      "name": "TXT",
      "bio": "Auto-generated from Topic Category: TXT",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCtiObj3CsEAdNU6ZPWDsddQ"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "42edd8b9-fb8f-4a18-bce6-6ee4f102463f",
      "name": "ATEEZ",
      "bio": "Auto-generated from Topic Category: ATEEZ",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UC2e4Ukj5Pfr7cb3KpJAFBdQ"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "52192f79-4158-4de6-bf02-8d5993879276",
      "name": "NCT",
      "bio": "Auto-generated from Topic Category: NCT",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCwgtORdDtUKhpjE1VBv6XfA"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "646a2379-d5be-4636-a868-c3494cc7c388",
      "name": "Red Velvet",
      "bio": "Auto-generated from Topic Category: Red Velvet",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCk9GmdlDTBfgGRb7vXeRMoQ"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "912d0d12-ae51-45f1-92f7-22817c9ace48",
      "name": "MAMAMOO",
      "bio": "Auto-generated from Topic Category: MAMAMOO",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCmjM9xIkzYMs8AEDR_OKQBg"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "3015756d-c218-4016-87d5-ff6b748546e7",
      "name": "Girls’ Generation",
      "bio": "Auto-generated from Topic Category: Girls’ Generation",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCfIMfXMJlAFBa3kOMEO7JnA"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "5ed7552f-df07-4b1a-826c-277f9787d21f",
      "name": "BIGBANG",
      "bio": "Auto-generated from Topic Category: BIGBANG",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCnkPeJFPayqai55lqrMEN5g"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "954c2be3-bf44-499a-a1a4-54b0f18434ac",
      "name": "Super Junior",
      "bio": "Auto-generated from Topic Category: Super Junior",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UCaO6TYtlC8U5ttz62hTrZgg"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "e4574b43-b220-423f-8ec5-20c1889e6ee8",
      "name": "IU",
      "bio": "Auto-generated from Topic Category: IU",
      "imageUrl": null,
      "platform": "YOUTUBE",
      "channelId": [
        "UC3SyT4_WLHzN7JcU2VMWJPQ"
      ],
      "isDraft": true,
      "socialPlatformUsername": null
    },
    {
      "id": "57d7fee1-742d-48ed-9b4e-8c10ba61c248",
      "name": "BLACKPINK",
      "bio": "4-member girl group from YG Entertainment, known for \"DDU-DU DDU-DU\", \"Kill This Love\", and \"How You Like That\"",
      "imageUrl": "https://yt3.ggpht.com/U3VrCkKjzTpQ3VYv4SCPjNfDHeJV-swGNnhLYhr0nV4lZz_GVUNzK4EB-HFRfKv9S5VNh14uAg=s800-c-k-c0x00ffffff-no-rj",
      "platform": "YOUTUBE",
      "channelId": [
        "UCOmHUn--16B90oW2L6FRR3A"
      ],
      "isDraft": false,
      "socialPlatformUsername": "UCOmHUn--16B90oW2L6FRR3A"
    },
    {
      "id": "dee214c0-c0bb-46c3-95cf-838c0920add4",
      "name": "TWICE",
      "bio": "TWICE OFFICIAL INSTAGRAM",
      "imageUrl": "https://yt3.ggpht.com/rj-m7CQIV8hIHx_lB8cjs0NxrDFJaUkVwZ5tCnZTNSVEr2IqXGF-2e7nr7og1IGeRXtHikce=s800-c-k-c0x00ffffff-no-rj",
      "platform": "YOUTUBE",
      "channelId": [
        "UCzgxx_DM2Dcb9Y1spb9mUJA"
      ],
      "isDraft": false,
      "socialPlatformUsername": "UCzgxx_DM2Dcb9Y1spb9mUJA"
    },
    {
      "id": "9fe1371e-3fb3-479e-8bff-b0c4083bcafb",
      "name": "SEVENTEEN",
      "bio": "13-member boy group from Pledis Entertainment, self-producing group known for \"Don't Wanna Cry\", \"Left & Right\", and \"Super\"",
      "imageUrl": "https://yt3.ggpht.com/8fqbFMfIjAMs6TuRGii5MEsXIdn5ZTliSbCPPfbZ8R07Pt15ht0n0OjexUCG8t4_q-c3YO2KXQ=s800-c-k-c0x00ffffff-no-rj",
      "platform": "YOUTUBE",
      "channelId": [
        "UCfkXDY7vwkcJ8ddFGz8KusA"
      ],
      "isDraft": false,
      "socialPlatformUsername": "UCfkXDY7vwkcJ8ddFGz8KusA"
    },
    {
      "id": "97596ade-6de5-4564-aaa8-f94dcbe405f8",
      "name": "NewJeans",
      "bio": "5-member girl group from ADOR (HYBE), rookie sensation known for \"Attention\", \"Hype Boy\", and \"OMG\"",
      "imageUrl": "https://yt3.ggpht.com/LJXS4gAz-_rkoqcgixJplCAwOLQXRNTYnGhyZQoJMZ2Uyp_akqREktZnvxbmmbES_UDp9hTT9y8=s800-c-k-c0x00ffffff-no-rj",
      "platform": "YOUTUBE",
      "channelId": [
        "UCMki_UkHb4qSc0qyEcOHHJw"
      ],
      "isDraft": false,
      "socialPlatformUsername": "UCMki_UkHb4qSc0qyEcOHHJw"
    },
    {
      "id": "5e3d6fec-30ce-43d9-a50c-86af43c4af46",
      "name": "ENHYPEN",
      "bio": "ENHYPEN (엔하이픈) is a 7-member South Korean boy group under BE:LIFT Lab, a subsidiary label under HYBE",
      "imageUrl": "https://yt3.ggpht.com/gKp9WExdyzEEBpHM7WgVEgIhl7-yVhIAzOe1U5jJEYSYi17AbvUXyW4dGRk2KykXeCsgUhqD4A=s800-c-k-c0x00ffffff-no-rj",
      "platform": "YOUTUBE",
      "channelId": [
        "UCArLZtok93cO5R9RI4_Y5Jw"
      ],
      "isDraft": false,
      "socialPlatformUsername": "UCArLZtok93cO5R9RI4_Y5Jw"
    }
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

  console.log(`✅ Seeded/Updated ${artistsData.length} total active artists`);
}
