const http = require("http");

/**
 * healthcheck.js
 * 
 * A simple, zero-dependency Node.js script to check the health of the container.
 * Usage: node healthcheck.js [port] [path]
 */

const port = process.argv[2] || 8080;
const path = process.argv[3] || "/health";

const options = {
  host: "localhost",
  port: port,
  path: path,
  timeout: 2000,
};

const request = http.get(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on("error", (err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});

request.on("timeout", () => {
  console.error("ERROR: Timeout");
  request.abort();
  process.exit(1);
});

request.end();
