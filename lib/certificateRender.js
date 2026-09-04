import { microserviceAxios } from "@/lib/axios";

/**
 * Ask the certificate microservice to render a PDF synchronously from a stored
 * render-data snapshot and return its bytes. Nothing is persisted to storage —
 * the service fills the template, converts via LibreOffice, and streams the
 * PDF back. Returns a Uint8Array of PDF bytes.
 */
export async function renderCertificatePdf(data) {
  const res = await microserviceAxios.post(
    "/certificates/render",
    data,
    { responseType: "arraybuffer", timeout: 120000 }
  );
  return new Uint8Array(res.data);
}
