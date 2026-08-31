import { NextResponse } from "next/server";
import { deploymentRepository } from "@/lib/repositories/deployment.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const deployments = await deploymentRepository.getAll();
    return NextResponse.json({
      ok: true,
      deployments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load deployments." },
      { status: 500 }
    );
  }
}