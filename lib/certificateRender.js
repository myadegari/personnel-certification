const MICROSERVICE_URL = process.env.MICROSERVICE_URL || "http://localhost:8000";

/**
 * Ask the certificate microservice to render a PDF synchronously from a stored
 * render-data snapshot and return its bytes. Nothing is persisted to storage —
 * the service fills the template, converts via LibreOffice, and streams the
 * PDF back. Returns a Uint8Array of PDF bytes.
 */
export async function renderCertificatePdf(data) {
  const res = await fetch(`${MICROSERVICE_URL}/certificates/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": process.env.MICROSERVICE_TOKEN || "",
    },
    body: JSON.stringify(data),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Certificate render failed (${res.status}) ${detail}`.trim());
  }
  return new Uint8Array(await res.arrayBuffer());
}
