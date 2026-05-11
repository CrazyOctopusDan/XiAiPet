import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const LOCAL_DATABASE_URL = 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_dev';

process.env.DATABASE_URL ??= LOCAL_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    url: process.env.DATABASE_URL
  }
});
