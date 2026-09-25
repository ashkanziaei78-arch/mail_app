// ابزار موقت اشکال‌زدایی: لاگ شکست بیلد را در دیتابیس می‌نویسد، چون لاگ بیلد Vercel
// از محیط توسعه قابل خواندن نیست. پس از سبز شدن بیلد حذف می‌شود.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2] ?? "/tmp/build.log";
const body = readFileSync(file, "utf8").slice(-12000);
const prisma = new PrismaClient();
await prisma.$executeRaw`insert into "_build_log" (body) values (${body})`;
await prisma.$disconnect();
