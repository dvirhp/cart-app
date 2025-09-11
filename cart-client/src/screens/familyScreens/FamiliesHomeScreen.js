import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listFamilies } from '../../api/familyApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function FamiliesHomeScreen({ navigation }) {
  const { token } = useAuth();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // --- Load families with React Query ---
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['families'],
    queryFn: () => listFamilies(token),
  });

  const families = data?.families || [];

  // --- Refresh data when screen comes into focus ---
  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries(['families']);
      queryClient.invalidateQueries(['carts']);
      refetch();
    }, [queryClient, refetch])
  );

  // --- Render a single family card (RTL layout) ---
  const renderFamily = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.familyCard,
        theme.container,
        { borderColor: mode === 'dark' ? '#fff' : '#ccc' },
      ]}
      onPress={() =>
        navigation.navigate('FamilyDetails', { familyId: item._id })
      }
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.familyAvatar} />
      ) : (
        <View style={styles.familyAvatarPlaceholder}>
          <Icon name="people-outline" size={20} color="#666" />
        </View>
      )}
      <Text style={[styles.familyName, theme.text]}>{item.name}</Text>
    </TouchableOpacity>
  );

  // --- Main screen rendering ---
  return (
    <View style={[styles.container, theme.container]}>
      {/* Action buttons */}
      <View style={styles.tilesRow}>
        <TouchableOpacity
          style={[
            styles.tile,
            theme.container,
            { borderColor: mode === 'dark' ? '#fff' : '#ccc' },
          ]}
          onPress={() => navigation.navigate('CreateFamily')}
        >
          <Text style={theme.text}>צור משפחה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tile,
            theme.container,
            { borderColor: mode === 'dark' ? '#fff' : '#ccc' },
          ]}
          onPress={() => navigation.navigate('JoinFamily')}
        >
          <Text style={theme.text}>הצטרף למשפחה</Text>
        </TouchableOpacity>
      </View>

      {/* Families list */}
      <Text style={[styles.title, theme.text]}>המשפחות שלי</Text>
      {isLoading ? (
        <Text style={theme.text}>טוען משפחות...</Text>
      ) : isError ? (
        <Text style={{ color: 'red' }}>
          שגיאה בטעינת משפחות: {error?.message}
        </Text>
      ) : (
        <FlatList
          data={families}
          keyExtractor={(f) => f._id}
          renderItem={renderFamily}
          ListEmptyComponent={<Text style={theme.text}>עדיין אין משפחות</Text>}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  tilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  tile: {
    flex: 1,
    marginHorizontal: 4,
    height: 120,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
    textAlign: 'right', // Align Hebrew text to the right
  },

  familyCard: {
    flexDirection: 'row-reverse', // Image on the right, text on the left (RTL)
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
  },

  familyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12, // spacing between avatar (right) and text (left)
  },

  familyAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12, // spacing for RTL layout
    justifyContent: 'center',
    alignItems: 'center',
  },

  familyName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right', // Ensure Hebrew text aligns right
    flexShrink: 1,
  },
});
