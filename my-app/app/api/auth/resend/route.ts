import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { sendOtp } from "@/app/api/auth/signup/route";

import { resendCooldowns } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 60-second cooldown check to prevent email flooding
    const now = Date.now();
    const lastSent = resendCooldowns.get(normalizedEmail);
    if (lastSent && now - lastSent < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSeconds}s before requesting another verification code.` },
        { status: 429 }
      );
    }

    let user;
    try {
      user = await db.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {
      // In development when database is offline
      if (process.env.NODE_ENV === "development") {
        resendCooldowns.set(normalizedEmail, now);
        console.log(`[DEV OTP RESEND] New code simulated for ${normalizedEmail}: 123456`);
        return NextResponse.json({ message: "A new verification code has been simulated for development." });
      }
      return NextResponse.json({ error: "Database service unavailable." }, { status: 500 });
    }

    if (!user) {
      // Return ambiguous message to prevent account enumeration
      return NextResponse.json({ message: "If an unverified account exists for this email, a code has been sent." });
    }

    if (user.verifiedAt) {
      return NextResponse.json({ error: "This account is already verified. You can proceed to log in." }, { status: 400 });
    }

    const newOtp = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(newOtp).digest("hex");
    const otpExpiresAt = new Date(now + 10 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
      },
    });

    resendCooldowns.set(normalizedEmail, now);

    try {
      await sendOtp(normalizedEmail, newOtp);
    } catch (err) {
      console.error("Failed to send resent OTP:", err);
      return NextResponse.json({ error: "Failed to send email. Please check your Brevo configuration." }, { status: 500 });
    }

    return NextResponse.json({ message: "A new verification code was sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json({ error: "Unable to resend verification code right now." }, { status: 500 });
  }
}
