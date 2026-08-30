import { NextResponse } from "next/server";
import { productionReleaseService } from "@/lib/services/production-release/production-release.service";

export async function POST(req: Request) {
  try {
    const { releaseId } = await req.json();
    if (!releaseId) return NextResponse.json({ ok: false, error: "releaseId is required" }, { status: 400 });
    const release = await productionReleaseService.approveProductionDeployment(releaseId);
    return NextResponse.json({ ok: true, release });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}