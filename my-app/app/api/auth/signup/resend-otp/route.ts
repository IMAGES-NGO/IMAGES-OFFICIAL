import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendSignupOtp } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`resend-ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many requests from this network. Please try again later." },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const emailLimit = checkRateLimit(`resend-email:${email}`, 3, 10 * 60 * 1000);
    if (!emailLimit.success) {
      return NextResponse.json(
        { error: "Too many verification requests for this email. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || (user.status as string) !== "UNVERIFIED") {
      return NextResponse.json(
        { error: "No unverified signup request found for this email." },
        { status: 400 }
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
      },
    });

    try {
      await sendSignupOtp(email, otp);
    } catch (emailErr) {
      console.error("Failed to resend signup OTP:", emailErr);
      return NextResponse.json(
        { error: "Unable to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "A new verification code has been sent to your email." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend signup OTP failed:", error);
    return NextResponse.json({ error: "Unable to resend code right now." }, { status: 500 });
  }
}
