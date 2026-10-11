import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`reset-ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many attempts from this connection. Please try again later." },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your details." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const otp = parsed.data.otp;

    // Rate limit OTP guessing attempts per email (max 5 attempts per 15 mins)
    const emailLimit = checkRateLimit(`reset-email:${email}`, 5, 15 * 60 * 1000);
    if (!emailLimit.success) {
      return NextResponse.json(
        { error: "Too many incorrect verification attempts. Please wait 15 minutes or request a new code." },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid verification code or email." },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpHash = createHash("sha256").update(otp).digest("hex");
    
    if (user.otpHash !== otpHash) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    // Update the user password and clear OTP fields
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    // Reset rate limiter on successful reset
    resetRateLimit(`reset-email:${email}`);

    return NextResponse.json(
      { message: "Your password has been successfully reset." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}
