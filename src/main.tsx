// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createQueryOptions } from '@/config/queryConfig';
import App from '@/App';
import '@/index.css';
import { preloadQueries } from '@/utils/cachePreloader';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: createQueryOptions(),
  },
});

// Preload all queries before rendering
preloadQueries(queryClient).then(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
});