import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your details." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const otp = parsed.data.otp;

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

    return NextResponse.json(
      { message: "Your password has been successfully reset." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }
}
