import { defineConfig, env } from "prisma/config"

// Note: process.loadEnvFile requires Node.js >= 20.12.0
// Minimum Node 20 LTS is required for this project.
process.loadEnvFile(".env.local")

type Env = {
  DATABASE_URL: string
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node -P tsconfig.seed.json prisma/seed.ts",
  },
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
})
