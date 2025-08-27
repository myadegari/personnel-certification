/* FILE: components/Providers.jsx (Create this new file) */
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

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
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

