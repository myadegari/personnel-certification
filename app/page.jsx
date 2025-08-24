// File: app/page.jsx
// This page acts as a loading/redirecting hub.
// The middleware will catch requests to this page from logged-in users
// and redirect them before they see this content.
// Unauthenticated users will be redirected to /login by the middleware.

import { Loader2 } from "lucide-react"; // A nice spinner icon from lucide-react

export default function RootPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-muted-foreground">
      <Loader2 className="h-12 w-12 animate-spin mb-4" />
      <p>در حال بارگذاری و انتقال...</p>
    </div>
  );
}
