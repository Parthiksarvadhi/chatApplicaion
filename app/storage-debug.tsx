import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface StorageData {
  [key: string]: string | null;
}

export default function StorageDebugScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [storageData, setStorageData] = useState<StorageData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      setLoading(true);
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      console.log('📦 All storage keys:', keys);

      // Get all values
      const data: StorageData = {};
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        data[key] = value;
        console.log(`📦 ${key}:`, value);
      }

      setStorageData(data);
    } catch (error) {
      console.error('Error loading storage:', error);
      Alert.alert('Error', 'Failed to load storage data');
    } finally {
      setLoading(false);
    }
  };

  const clearAllStorage = async () => {
    Alert.alert(
      'Clear All Storage?',
      'This will delete all stored data including login info',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await logout();
              
              Alert.alert(
                'Storage Cleared',
                'All memory cleared. Please login again.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/login');
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const clearKey = async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
      Alert.alert('Success', `Deleted: ${key}`);
      loadStorageData();
    } catch (error) {
      Alert.alert('Error', `Failed to delete ${key}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const keys = Object.keys(storageData);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Storage Debug</Text>
        <TouchableOpacity onPress={loadStorageData}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Storage Info */}
      <ScrollView style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Total Keys Stored:</Text>
          <Text style={styles.infoValue}>{keys.length}</Text>
        </View>

        {keys.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No data stored in memory</Text>
          </View>
        ) : (
          keys.map((key) => (
            <View key={key} style={styles.storageItem}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemKey}>{key}</Text>
                <TouchableOpacity
                  onPress={() => clearKey(key)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemValueBox}>
                {key === 'user' ? (
                  // Parse and display user object nicely
                  <Text style={styles.itemValue}>
                    {JSON.stringify(JSON.parse(storageData[key] || '{}'), null, 2)}
                  </Text>
                ) : (
                  <Text style={styles.itemValue}>{storageData[key]}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, styles.refreshBtn]}
          onPress={loadStorageData}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.clearBtn]}
          onPress={clearAllStorage}
        >
          <Ionicons name="trash" size={20} color="#FF3B30" />
          <Text style={[styles.btnText, { color: '#FF3B30' }]}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  storageItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  itemValueBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  itemValue: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Courier New',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  refreshBtn: {
    backgroundColor: '#f0f0f0',
  },
  clearBtn: {
    backgroundColor: '#ffe8e8',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
