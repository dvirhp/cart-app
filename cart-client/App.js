import React from 'react';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ActiveCartProvider } from './src/context/ActiveCartContext';

// Initialize React Query client (used for server state management)
const qc = new QueryClient();

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ActiveCartProvider>
          <QueryClientProvider client={qc}>
            <SafeAreaProvider>
              {/* Ensure SafeAreaView covers the top edge to avoid layout issues with status bar */}
              <SafeAreaView style={styles.container} edges={['top']}>
                <RootNavigator />
              </SafeAreaView>
            </SafeAreaProvider>
          </QueryClientProvider>
        </ActiveCartProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Fill entire screen
  },
});
