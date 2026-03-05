async function checkHeaders() {
  const url =
    "https://d1lq91nbxprxl1.cloudfront.net/uploads/1772171685943-6089fbd3481e16ad.mp3";
  try {
    const response = await fetch(url, { method: "HEAD" });
    console.log("Status:", response.status);
    console.log("Content-Type:", response.headers.get("content-type"));
    console.log(
      "Access-Control-Allow-Origin:",
      response.headers.get("access-control-allow-origin"),
    );
  } catch (err: any) {
    console.error("Error fetching headers:", err.message);
  }
}

checkHeaders();
