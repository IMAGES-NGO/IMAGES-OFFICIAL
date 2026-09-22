import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetOtp } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email },
    });

    // If the user does not exist, we still return a success response
    // to prevent email enumeration attacks.
    if (!user) {
      return NextResponse.json(
        { message: "If an account with that email exists, we have sent a password reset code." },
        { status: 200 }
      );
    }

    // Generate a new 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await db.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt,
      },
    });

    try {
      await sendPasswordResetOtp(email, otp);
    } catch (sendErr) {
      console.error("Failed to send OTP:", sendErr);
      return NextResponse.json({ error: "Unable to send verification code. Please try again." }, { status: 500 });
    }

    return NextResponse.json(
      { message: "If an account with that email exists, we have sent a password reset code." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}
