import "dotenv/config";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// One admin + one member, both APPROVED and verified so they can log in immediately.
const SEED_USERS: Array<{ username: string; email: string; password: string; role: UserRole }> = [
  { username: "admin_demo", email: "admin.demo@images.local", password: "Images@Admin1", role: "ADMIN" },
  { username: "member_demo", email: "member.demo@images.local", password: "Images@Member1", role: "MEMBER" },
];

async function upsert(user: (typeof SEED_USERS)[number]) {
  const email = user.email.toLowerCase();
  const username = user.username.toLowerCase(); // login lowercases usernames
  const passwordHash = await bcrypt.hash(user.password, 12);
  const status: UserStatus = "APPROVED";

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username: { equals: username, mode: "insensitive" } }] },
  });

  const data = { username, email, passwordHash, role: user.role, status, verifiedAt: new Date(), otpHash: null, otpExpiresAt: null };
  const saved = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });

  const ok = await bcrypt.compare(user.password, saved.passwordHash);
  console.log(`${existing ? "Updated" : "Created"} ${saved.role.padEnd(6)}  ${saved.email}  (login verify: ${ok ? "OK" : "FAILED"})`);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is not set.");
  for (const user of SEED_USERS) await upsert(user);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
