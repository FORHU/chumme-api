import axios from "axios";
import jwt from "jsonwebtoken";

const baseUrl = "http://localhost:3002/api/v1";
const ACCESS_TOKEN_SECRET =
  "b99d9648037af0a1cc35638a6d55ccc51c6649a5bb6295fb8849ac4274f7474e";
const userId = "2ba16626-db79-4cd7-8460-3bc5ef11ca38";

async function test() {
  const token = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

  console.log("Testing new endpoint: GET /room-subcategories/category/usa");
  try {
    const res = await axios.get(`${baseUrl}/room-subcategories/category/usa`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Status:", res.status);
    console.log(
      "Number of subcategories returned:",
      res.data.subCategories.length,
    );

    // Print out a sample to verify it includes the random seeded categories
    if (res.data.subCategories.length > 0) {
      console.log("Sample Subcategory Name:", res.data.subCategories[0].name);
      console.log("Members Count:", res.data.subCategories[0].membersCount);
    }
  } catch (err: any) {
    console.error(
      "Error:",
      err.response?.status,
      err.response?.data || err.message,
    );
  }
}

test();
