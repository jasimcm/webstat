/**
 * Cookieless visitor identity: an HMAC of (site + ip + user-agent + UTC date).
 * Including the date makes the id rotate automatically every day (Plausible's approach),
 * so no PII is ever stored and no persistent cookie/localStorage is needed.
 */
export async function computeVisitorId(params: {
  siteId: string;
  ip: string;
  userAgent: string;
}): Promise<string> {
  const salt = process.env.VISITOR_ID_SALT;
  if (!salt) {
    throw new Error("VISITOR_ID_SALT env var is required");
  }

  const utcDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const message = `${params.siteId}:${params.ip}:${params.userAgent}:${utcDate}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));

  return bufferToHex(signature).slice(0, 32);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
