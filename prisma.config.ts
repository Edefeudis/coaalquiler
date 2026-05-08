import { defineConfig } from '@prisma/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export default defineConfig({
  datasource: {
    adapter: new PrismaMariaDb(process.env.DATABASE_URL!)
  }
})