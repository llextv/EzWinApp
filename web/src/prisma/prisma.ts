import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from "@prisma/client";
import 'dotenv/config';

const adapterApiClient = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5
});

const prisma = new PrismaClient({ adapter: adapterApiClient });

export { prisma }