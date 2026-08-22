"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
const client_1 = require("@prisma/client");
require("dotenv/config");
const adapterApiClient = new adapter_mariadb_1.PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5
});
const prisma = new client_1.PrismaClient({ adapter: adapterApiClient });
exports.prisma = prisma;
