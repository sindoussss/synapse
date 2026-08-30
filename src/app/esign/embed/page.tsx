"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";

function EmbeddedSigningContent() {
  const searchParams = useSearchParams();
  const signatureId = searchParams.get("signatureId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!signatureId) {
      setError("Missing signatureId parameter.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function initHelloSign() {
      try {
        const res = await fetch(`/api/agreements/signing/embed-url?signatureId=${signatureId}`);
        const data = await res.json();

        if (!data.ok || !data.signUrl) {
          throw new Error(data.error || "Failed to retrieve signing URL from Dropbox Sign.");
        }

        const HelloSignModule = await import("hellosign-embedded");
        const HelloSign = HelloSignModule.default || HelloSignModule;

        if (!isMounted) return;

        setLoading(false);

        if (containerRef.current) {
          const client = new HelloSign({
            clientId: data.clientId,
          });

          client.open(data.signUrl, {
            container: containerRef.current,
            skipDomainVerification: true,
            testMode: true,
          });

          client.on("sign", (eventData: any) => {
            alert("Signature successfully submitted to Dropbox Sign!");
          });

          client.on("error", (errData: any) => {
            console.error("Dropbox Sign Error:", errData);
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to initialize Dropbox Sign.");
          setLoading(false);
        }
      }
    }

    initHelloSign();

    return () => {
      isMounted = false;
    };
  }, [signatureId]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <div className="flex items-center justify-between border-b border-[#d4d4d0] bg-white/80 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h1 className="text-sm font-semibold text-[#222222]">
            Dropbox Sign Live Two-Party Signing
          </h1>
        </div>
        {signatureId && (
          <span className="text-xs text-[#666666]">
            Signature ID: <code className="text-[#1a365d] font-mono">{signatureId}</code>
          </span>
        )}
      </div>

      {loading && (
        <div className="flex h-[calc(100vh-49px)] items-center justify-center">
          <div className="flex items-center gap-3 text-[#333333]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            <p>Initializing Secure Dropbox Sign Session...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex h-[calc(100vh-49px)] items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center">
            <h2 className="text-lg font-bold text-red-400">Signing Session Error</h2>
            <p className="mt-2 text-sm text-[#333333]">{error}</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="h-[calc(100vh-49px)] w-full bg-white"
        style={{ display: loading || error ? "none" : "block" }}
      />
    </div>
  );
}

export default function EmbeddedSigningPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white text-[#111111] p-6">Loading...</div>}>
      <EmbeddedSigningContent />
    </Suspense>
  );
}