import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import { requireAuth } from "@/lib/authGuard";
import { isStaffRole } from "@/lib/roles";
import { resolveCertificateStatus } from "@/lib/certificateStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 1500;

// GET /api/enrollments/[id]/certificate-status/stream
// Server-Sent Events stream that pushes certificate lifecycle updates to the
// browser until the job reaches a terminal state (completed/failed).
export async function GET(request, { params }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  await dbConnect();

  const enrollment = await Enrollment.findById(id);
  if (!enrollment) {
    return new Response("Not found", { status: 404 });
  }

  const isOwner = enrollment.user.toString() === session.user.id;
  if (!isOwner && !isStaffRole(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let timer = null;
  let done = false;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        try {
          controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const tick = async () => {
        try {
          const fresh = await Enrollment.findById(id);
          if (!fresh) return finish();
          const { status, fileId } = await resolveCertificateStatus(fresh);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status, fileId })}\n\n`)
          );
          if (status === "completed" || status === "failed") finish();
        } catch {
          finish();
        }
      };

      request.signal.addEventListener("abort", cleanup);
      tick();
      timer = setInterval(tick, POLL_MS);
    },
    cancel() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
