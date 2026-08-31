import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveHttpIdentity, type HttpPrincipal } from "./http-identity";

/**
 * Page-level operator identity. Must run before any sensitive data load.
 * Identity comes only from the operator bearer token or HMAC session cookie.
 */
export async function requireOperatorPagePrincipal(nextPath: string): Promise<HttpPrincipal> {
  const headerStore = await headers();
  const req = new Request(`http://synapse.local${nextPath}`, {
    headers: {
      cookie: headerStore.get("cookie") || "",
      authorization: headerStore.get("authorization") || "",
    },
  });
  const principal = resolveHttpIdentity(req);
  if (!principal || principal.actorRole !== "OPERATOR") {
    const safeNext = nextPath.startsWith("/") ? nextPath : "/";
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }
  return principal;
}
