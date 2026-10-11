import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { verifyOtpSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid 6-digit verification code." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const otp = parsed.data.otp;

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "No pending signup found for this email." }, { status: 404 });
    }

    if (user.status === "APPROVED") {
      return NextResponse.json({ error: "This account has already been approved. Please log in." }, { status: 400 });
    }

    if (user.status === "PENDING") {
      return NextResponse.json({ error: "Email is already verified. Your request is pending admin approval." }, { status: 400 });
    }

    if (user.status !== "UNVERIFIED") {
      return NextResponse.json({ error: "Invalid account status for verification." }, { status: 400 });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return NextResponse.json({ error: "No active verification code found. Please request a new code." }, { status: 400 });
    }

    if (user.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    const calculatedHash = createHash("sha256").update(otp).digest("hex");
    if (user.otpHash !== calculatedHash) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // Mark as verified and transition to PENDING admin approval
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        status: "PENDING",
        verifiedAt: new Date(),
        otpHash: null,
        otpExpiresAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        message: "Email verified successfully! Your request has been submitted for admin approval.",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signup OTP verification failed:", error);
    return NextResponse.json({ error: "Unable to verify code. Please try again." }, { status: 500 });
  }
}
