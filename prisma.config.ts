import * as dotenv from "dotenv"
import { defineConfig, env } from "prisma/config"

dotenv.config({ path: ".env.local" })

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
