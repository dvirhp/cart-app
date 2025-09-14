import React from "react";
import { StyleSheet } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { ActiveCartProvider } from "./src/context/ActiveCartContext";

const qc = new QueryClient();

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ActiveCartProvider>
          <QueryClientProvider client={qc}>
            <SafeAreaProvider>
              <SafeAreaView style={styles.container} edges={["top"]}>
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
  container: { flex: 1 },
});
