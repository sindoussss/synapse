import { NextResponse } from "next/server";
import { clientReviewService } from "@/lib/services/client-review/client-review.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const feedback = await clientReviewService.ingestFeedback(body);
    return NextResponse.json({ ok: true, feedback });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}