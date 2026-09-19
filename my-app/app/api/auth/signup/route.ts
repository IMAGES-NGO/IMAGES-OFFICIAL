import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";

async function sendOtp(email: string, otp: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) throw new Error("Brevo is not configured");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME ?? "IMAGES" },
      to: [{ email }],
      subject: "Your IMAGES verification code",
      textContent: `Your IMAGES verification code is ${otp}. It expires in 10 minutes.`,
    }),
  });
  if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const username = parsed.data.username.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const otp = randomInt(100000, 1000000).toString();
    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: parsed.data.role,
        otpHash: createHash("sha256").update(otp).digest("hex"),
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      select: { id: true, username: true, email: true },
    });

    try {
      await sendOtp(email, otp);
    } catch (error) {
      await db.user.delete({ where: { id: user.id } });
      throw error;
    }

    return NextResponse.json({ user, message: "Verification code sent." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That email or username is already in use." }, { status: 409 });
    }
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 });
  }
}
