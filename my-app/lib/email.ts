import { NextResponse } from "next/server";

export async function sendApprovalEmail(email: string, username: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  
  if (!apiKey || !senderEmail) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV EMAIL NOTIFICATION] Approval email for ${email} (${username})`);
      return;
    }
    throw new Error("Brevo is not configured");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME ?? "IMAGES" },
      to: [{ email }],
      subject: "Your IMAGES account has been approved",
      textContent: `Hello ${username},\n\nYour account has been approved by an administrator. You can now log in to access your member account.\n\nThank you,\nIMAGES Team`,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Brevo returned ${response.status}`);
  }
}

export async function sendPasswordResetOtp(email: string, otp: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  
  if (!apiKey || !senderEmail) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV EMAIL NOTIFICATION] Password reset OTP for ${email}: ${otp}`);
      return;
    }
    throw new Error("Brevo is not configured");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME ?? "IMAGES" },
      to: [{ email }],
      subject: "IMAGES Password Reset",
      textContent: `Your IMAGES password reset code is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Brevo returned ${response.status}`);
  }
}
