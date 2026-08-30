import { NextResponse } from "next/server";
import { opportunityRepository } from "@/lib/repositories/opportunity.repository";

export async function GET() {
  try {
    const opportunities = await opportunityRepository.getAll();
    return NextResponse.json({ ok: true, opportunities });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list opportunities." },
      { status: 500 }
    );
  }
}