import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, Button } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UsersScreen({ navigation }) {
  const { token, signOut } = useAuth();
  console.log("👉 UsersScreen token:", token);

  const [q, setQ] = useState('');

  // Fetch users with optional search query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', q],
    queryFn: () => fetchUsers(token, { q }),
  });

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Navigation actions */}
      <View style={{ marginBottom: 16 }}>
        <Button
          title="My Family"
          onPress={() => navigation.navigate('Family')}
        />
        <View style={{ height: 8 }} />
        <Button
          title="Join Family with Code"
          onPress={() => navigation.navigate('JoinFamily')}
        />
      </View>

      {/* Search input */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name/email"
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 }}
        />
        <Button title="Search" onPress={() => refetch()} />
      </View>

      {/* Logout button */}
      <Button title="Sign Out" onPress={signOut} />

      {/* Users list */}
      {isLoading ? (
        <Text style={{ marginTop: 16 }}>Loading...</Text>
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={data?.data || []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderBottomWidth: 1 }}>
              <Text style={{ fontWeight: '600' }}>{item.displayName}</Text>
              <Text>{item.email}</Text>
              <Text style={{ color: '#555' }}>{item.role}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
