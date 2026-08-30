import { NextRequest, NextResponse } from "next/server";
import { dropboxSignProvider } from "@/lib/services/agreements/providers/dropbox-sign.provider";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const signatureId = searchParams.get("signatureId");
    if (!signatureId) {
      return NextResponse.json({ ok: false, error: "signatureId required" }, { status: 400 });
    }

    const signUrl = await dropboxSignProvider.getEmbeddedSignUrl(signatureId);
    if (!signUrl) {
      return NextResponse.json({ ok: false, error: "Failed to generate signing URL from Dropbox Sign" }, { status: 500 });
    }

    const clientId = process.env.DROPBOX_SIGN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ ok: false, error: "DROPBOX_SIGN_CLIENT_ID is not configured" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, signUrl, clientId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}