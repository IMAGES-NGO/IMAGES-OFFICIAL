import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";

export async function sendOtp(email: string, otp: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV OTP NOTIFICATION] Code for ${email}: ${otp}`);
      return;
    }
    throw new Error("Brevo is not configured");
  }

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

    // Check if an existing account is present
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      // If the account is already verified, do not allow overwriting
      if (existingUser.verifiedAt) {
        return NextResponse.json(
          { error: "That email or username is already registered and verified." },
          { status: 409 }
        );
      }

      // If the user has an unverified account, refresh their password & generate a new OTP
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const otp = randomInt(100000, 1000000).toString();
      const otpHash = createHash("sha256").update(otp).digest("hex");
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.user.update({
        where: { id: existingUser.id },
        data: {
          username,
          passwordHash,
          otpHash,
          otpExpiresAt,
        },
      });

      try {
        await sendOtp(email, otp);
      } catch (sendErr) {
        console.error("Failed to send OTP:", sendErr);
        return NextResponse.json({ error: "Unable to send verification code. Please try again." }, { status: 500 });
      }

      return NextResponse.json(
        {
          user: { id: existingUser.id, username, email },
          message: "A new verification code was sent to your email.",
        },
        { status: 200 }
      );
    }

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
