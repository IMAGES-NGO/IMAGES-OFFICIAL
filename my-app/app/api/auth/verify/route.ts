import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { verifyOtpSchema } from "@/lib/validations/auth";

import { verificationAttempts } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  const parsed = verifyOtpSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and 6-digit code." }, { status: 400 });

  const normalizedEmail = parsed.data.email.toLowerCase();
  const now = Date.now();

  // Check if account is temporarily locked due to excessive failed attempts
  const attemptRecord = verificationAttempts.get(normalizedEmail);
  if (attemptRecord && attemptRecord.lockedUntil > now) {
    const minutesLeft = Math.ceil((attemptRecord.lockedUntil - now) / (60 * 1000));
    return NextResponse.json(
      { error: `Too many failed attempts. This account is locked for ${minutesLeft} minute(s). Please try again later or request a new code.` },
      { status: 429 }
    );
  }

  let user = null;
  try {
    user = await db.user.findUnique({ where: { email: normalizedEmail } });
  } catch {
    // In local dev without DB
    if (process.env.NODE_ENV === "development") {
      if (parsed.data.otp === "123456") {
        verificationAttempts.delete(normalizedEmail);
        return NextResponse.json({ message: "Email verified (simulated in development). You can now log in." });
      }
    }
  }

  const codeHash = createHash("sha256").update(parsed.data.otp).digest("hex");
  const isInvalid = !user || user.verifiedAt || user.otpHash !== codeHash || !user.otpExpiresAt || user.otpExpiresAt < new Date();

  if (isInvalid) {
    const isExpiredLockout = attemptRecord && attemptRecord.lockedUntil > 0 && attemptRecord.lockedUntil <= now;
    const previousCount = isExpiredLockout ? 0 : attemptRecord?.count || 0;
    const currentCount = previousCount + 1;
    const isLockedNow = currentCount >= 5;
    const lockedUntil = isLockedNow ? now + 15 * 60 * 1000 : 0;

    verificationAttempts.set(normalizedEmail, { count: currentCount, lockedUntil });

    if (isLockedNow) {
      return NextResponse.json(
        { error: "Too many failed attempts. Account verification locked for 15 minutes." },
        { status: 429 }
      );
    }

    const attemptsRemaining = 5 - currentCount;
    return NextResponse.json(
      { error: `That code is invalid or expired. (${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining)` },
      { status: 400 }
    );
  }

  // Verification succeeded - clear failed attempts
  verificationAttempts.delete(normalizedEmail);

  if (!user) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { verifiedAt: new Date(), otpHash: null, otpExpiresAt: null },
  });

  return NextResponse.json({ message: "Email verified. You can now log in." });
}