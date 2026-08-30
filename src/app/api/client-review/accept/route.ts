import { NextResponse } from "next/server";
import { clientReviewService } from "@/lib/services/client-review/client-review.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await clientReviewService.confirmClientAcceptance(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}