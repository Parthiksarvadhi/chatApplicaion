import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { groupAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

interface Group {
  id: number;
  name: string;
  description: string;
  created_at: string;
  creator_name?: string;
  member_count?: number;
}

export default function ExploreScreen() {
  const router = useRouter();
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadAllGroups();
  }, []);

  useEffect(() => {
    if (searchText.trim()) {
      const filtered = allGroups.filter((group) =>
        group.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(allGroups);
    }
  }, [searchText, allGroups]);

  const loadAllGroups = async () => {
    try {
      setLoading(true);
      const response = await groupAPI.getAllGroups();
      setAllGroups(response.data);
      setFilteredGroups(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load groups');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllGroups();
    setRefreshing(false);
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      await groupAPI.joinGroup(groupId);
      Alert.alert('Success', 'Joined group successfully');
      loadAllGroups();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to join group');
    }
  };

  const handleGroupPress = (groupId: number) => {
    router.push(`/chat/${groupId}`);
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupContent}>
        <Text style={styles.groupName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.groupMeta}>
          {item.creator_name && (
            <Text style={styles.metaText}>
              <Ionicons name="person" size={12} /> {item.creator_name}
            </Text>
          )}
          {item.member_count !== undefined && (
            <Text style={styles.metaText}>
              <Ionicons name="people" size={12} /> {item.member_count} members
            </Text>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => handleGroupPress(item.id)}
        >
          <Ionicons name="eye" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => handleJoinGroup(item.id)}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="compass-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchText ? 'No groups found' : 'No groups available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  listContent: {
    padding: 12,
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupContent: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  groupDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});
