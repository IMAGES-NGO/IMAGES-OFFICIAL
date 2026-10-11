import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendSignupOtp } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || user.status !== "UNVERIFIED") {
      return NextResponse.json(
        { error: "No unverified signup request found for this email." },
        { status: 400 }
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
