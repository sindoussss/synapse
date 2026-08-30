import { NextResponse } from "next/server";
import { emailSendRepository } from "@/lib/repositories/email-send.repository";

export async function GET() {
  try {
    const sends = await emailSendRepository.getAll();
    return NextResponse.json({
      ok: true,
      sends,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list email sends." },
      { status: 500 }
    );
  }
}