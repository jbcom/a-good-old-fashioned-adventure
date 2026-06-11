import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/persistence/schema.ts",
  out: "./src/persistence/drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./.local/agofa-save.sqlite",
  },
  verbose: true,
  strict: true,
});
