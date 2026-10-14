import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import { sendSignupOtp } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // 1. IP-level rate limiting to prevent automated Brevo quota abuse
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`signup-ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many signup attempts from this connection. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const username = parsed.data.username.toLowerCase();

    // 2. Email-level rate limiting (max 3 signup attempts per 15 mins for the same email)
    const emailLimit = checkRateLimit(`signup-email:${email}`, 3, 15 * 60 * 1000);
    if (!emailLimit.success) {
      return NextResponse.json(
        { error: "Too many signup verification attempts for this email. Please check your inbox or wait 15 minutes." },
        { status: 429 }
      );
    }

    // Check if an existing account is present
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      const currentStatus = existingUser.status as string;
      if (currentStatus === "APPROVED") {
        return NextResponse.json(
          { error: "An account with that email or username already exists. Please log in." },
          { status: 409 }
        );
      }
      if (currentStatus === "PENDING") {
        return NextResponse.json(
          { error: "A signup request with that email or username is already pending administrator approval." },
          { status: 409 }
        );
      }
      if (currentStatus === "REJECTED") {
        return NextResponse.json(
          { error: "A registration request with that email or username was previously declined." },
          { status: 409 }
        );
      }

      // If existing user is UNVERIFIED, check if it's the same email
      if (existingUser.email !== email) {
        return NextResponse.json(
          { error: "That username is already reserved. Please choose another." },
          { status: 409 }
        );
      }
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    if (existingUser && (existingUser.status as string) === "UNVERIFIED") {
      await db.user.update({
        where: { id: existingUser.id },
        data: {
          username,
          passwordHash,
          role: parsed.data.role,
          otpHash,
          otpExpiresAt,
          verifiedAt: null,
        },
      });
    } else {
      await db.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: parsed.data.role,
          status: "UNVERIFIED" as any,
          otpHash,
          otpExpiresAt,
          verifiedAt: null,
        },
      });
    }

    try {
      await sendSignupOtp(email, otp);
    } catch (emailErr) {
      console.error("Failed to send signup verification OTP:", emailErr);
      return NextResponse.json(
        { error: "Unable to send verification email. Please check the email address or try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Verification code sent to your email.",
        email,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That email or username is already in use." }, { status: 409 });
    }
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Unable to process your signup right now." }, { status: 500 });
  }
}
