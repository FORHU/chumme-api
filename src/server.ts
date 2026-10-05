// src/server.ts
import app from "./app";

import { PORT } from "./config";
import logger from "./utils/logger";

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server is running on http://0.0.0.0:${PORT}`);
});
