import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const username = parsed.data.username.toLowerCase();

    // Check if an existing account is present
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "That email or username is already registered." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    
    // @ts-ignore - status is added in schema but Prisma Client might not be generated
    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: parsed.data.role,
        status: "PENDING",
      },
      select: { id: true, username: true, email: true },
    });

    return NextResponse.json({ user, message: "Signup request submitted. Pending admin approval." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That email or username is already in use." }, { status: 409 });
    }
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 });
  }
}
