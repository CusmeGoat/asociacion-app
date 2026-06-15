import fs from "fs";
import path from "path";

import { initializeDatabase } from "./config/data-source";
import { env } from "./config/env";
import { createApp } from "./app";

async function bootstrap() {
  fs.mkdirSync(path.join(process.cwd(), env.staticRoot, "documents"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), env.staticRoot, "images"), { recursive: true });

  await initializeDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Node API escuchando en http://127.0.0.1:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
