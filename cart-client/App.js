import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';

const qc = new QueryClient();

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={qc}>
        <RootNavigator />
      </QueryClientProvider>
    </AuthProvider>
  );
}
