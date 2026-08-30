import { NextResponse } from "next/server";
import { deploymentRepository } from "@/lib/repositories/deployment.repository";

export async function GET() {
  try {
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