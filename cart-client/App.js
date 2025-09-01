import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Initialize React Query client (used for server state management)
const qc = new QueryClient();

export default function App() {
  return (
    // ---- Global Auth Context (manages login state & user) ----
    <AuthProvider>
      {/* ---- Global Theme Context (light/dark mode) ---- */}
      <ThemeProvider>
        {/* ---- React Query Provider (for caching/fetching data) ---- */}
        <QueryClientProvider client={qc}>
          {/* Safe area wrapper to respect notches/status bar */}
          <SafeAreaView style={{ flex: 1 }}>
            {/* Scrollable container for the entire app */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              contentInsetAdjustmentBehavior="automatic"
            >
              {/* Main navigation entry point */}
              <RootNavigator />
            </ScrollView>
          </SafeAreaView>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1, // full height
  },
  scrollContent: {
    flexGrow: 1,        // content expands to fill available space
    padding: 16,        // horizontal padding
    paddingTop: 32,     // extra top padding for safe space
  },
});
