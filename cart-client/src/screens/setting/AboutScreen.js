import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';

// ✅ This screen is a simple "About" page placeholder
// ✅ Using RTL direction to support Hebrew text properly
// ✅ Styles are kept minimal and clean for readability

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>מסך אודות</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    direction: I18nManager.isRTL ? 'rtl' : 'ltr' // Ensure text direction
  },
  text: { 
    fontSize: 18, 
    textAlign: 'right' // Align text properly for Hebrew
  },
});
