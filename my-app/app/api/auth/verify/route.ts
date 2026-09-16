import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { verifyOtpSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const parsed = verifyOtpSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and 6-digit code." }, { status: 400 });

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const codeHash = createHash("sha256").update(parsed.data.otp).digest("hex");
  if (!user || user.verifiedAt || user.otpHash !== codeHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { verifiedAt: new Date(), otpHash: null, otpExpiresAt: null },
  });
  return NextResponse.json({ message: "Email verified. You can now log in." });
}