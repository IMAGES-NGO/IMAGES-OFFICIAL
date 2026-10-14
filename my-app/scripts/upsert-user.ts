import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "images.desk@gmail.com").toLowerCase();
  const username = process.argv[3] || "IMAGES";
  const rawPassword = process.argv[4] || "IMAGESngo123";
  const role: UserRole = (process.argv[5] as UserRole) || "ADMIN";
  const status: UserStatus = "APPROVED";

  console.log(`Hashing password for ${email}...`);
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  // Check if user exists by email or username
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username: { equals: username, mode: "insensitive" } },
      ],
    },
  });

  let savedUser;
  if (existingUser) {
    console.log(`Found existing user (id: ${existingUser.id}, current username: ${existingUser.username}). Updating...`);
    savedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username,
        email,
        passwordHash,
        role,
        status,
        verifiedAt: new Date(),
        otpHash: null,
        otpExpiresAt: null,
      },
    });
  } else {
    console.log(`Creating new user for ${email}...`);
    savedUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role,
        status,
        verifiedAt: new Date(),
      },
    });
  }

  console.log("User successfully saved to database:");
  console.log({
    id: savedUser.id,
    username: savedUser.username,
    email: savedUser.email,
    role: savedUser.role,
    status: savedUser.status,
    verifiedAt: savedUser.verifiedAt,
  });

  // Verify password matches
  const verified = await bcrypt.compare(rawPassword, savedUser.passwordHash);
  console.log(`Password verification test: ${verified ? "SUCCESS" : "FAILED"}`);
}

main()
  .catch((err) => {
    console.error("Error updating user:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
