'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'motion/react';

// This component provides the TanStack Query client to all child components.
export default function Providers({ children }) {
  // We use useState to ensure the QueryClient is only created once per component lifecycle.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Default settings for all queries
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every motion/react animation respect the
          OS prefers-reduced-motion setting globally (transform/opacity
          animations are skipped, layout animations become instant). */}
      <MotionConfig reducedMotion="user">
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </MotionConfig>
    </QueryClientProvider>
  );
}
