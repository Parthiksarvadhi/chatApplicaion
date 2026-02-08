import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = "http://192.168.2.28:5000/api";

console.log('API Base URL:', API_BASE_URL);
console.log('Platform:', Platform.OS);

// Helper to make API requests
async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[${method}] ${url}`);

    const options: any = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      (error as any).response = { data, status: response.status };
      throw error;
    }

    return { data, status: response.status };
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

export const authAPI = {
  register: (username: string, email: string, password: string) =>
    apiCall('/auth/register', 'POST', { username, email, password }),
  login: (email: string, password: string) =>
    apiCall('/auth/login', 'POST', { email, password }),
};

export const groupAPI = {
  createGroup: (name: string, description: string) =>
    apiCall('/groups', 'POST', { name, description }),
  listGroups: () => apiCall('/groups', 'GET'),
  getAllGroups: () => apiCall('/groups/all', 'GET'),
  joinGroup: (groupId: number) => apiCall(`/groups/${groupId}/join`, 'POST'),
  getGroupDetails: (groupId: number) => apiCall(`/groups/${groupId}`, 'GET'),
  getGroupMembers: (groupId: number) => apiCall(`/groups/${groupId}/members`, 'GET'),
};

export const messageAPI = {
  sendMessage: (groupId: number, content: string) =>
    apiCall(`/messages/${groupId}/send`, 'POST', { content }),
  sendImage: async (groupId: number, imageUri: string, fileName: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = `${API_BASE_URL}/messages/${groupId}/send-image`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      } as any);

      console.log(`[POST] ${url} (image upload)`);
      console.log('📤 FormData prepared with file:', fileName);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData,
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      const text = await response.text();
      console.log('📥 Response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('❌ Failed to parse response:', e);
        console.error('Response was:', text.substring(0, 200));
        throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}`);
        (error as any).response = { data, status: response.status };
        throw error;
      }

      return { data, status: response.status };
    } catch (error) {
      console.error(`API Error [POST /messages/${groupId}/send-image]:`, error);
      throw error;
    }
  },
  getMessages: (groupId: number, limit = 50, offset = 0) =>
    apiCall(`/messages/${groupId}?limit=${limit}&offset=${offset}`, 'GET'),
  deleteMessage: (messageId: number) => apiCall(`/messages/${messageId}`, 'DELETE'),
  markAsRead: (messageId: number) => apiCall(`/messages/${messageId}/read`, 'POST'),
  getReaders: (messageId: number) => apiCall(`/messages/${messageId}/readers`, 'GET'),
  searchMessages: (groupId: number, q: string) =>
    apiCall(`/messages/${groupId}/search?q=${encodeURIComponent(q)}`, 'GET'),
  addReaction: (messageId: number, reactionType: string) =>
    apiCall(`/messages/${messageId}/react`, 'POST', { reactionType }),
  removeReaction: (messageId: number, reactionType: string) =>
    apiCall(`/messages/${messageId}/react`, 'DELETE', { reactionType }),
  getReactions: (messageId: number) =>
    apiCall(`/messages/${messageId}/reactions`, 'GET'),
};

export const userAPI = {
  getProfile: () => apiCall('/users/profile', 'GET'),
  updateProfile: (data: any) => apiCall('/users/profile', 'PUT', data),
  getPresence: () => apiCall('/users/presence', 'GET'),
  getGroupPresence: (groupId: number) => apiCall(`/users/groups/${groupId}/presence`, 'GET'),
  savePushToken: (pushToken: string) => apiCall('/users/push-token', 'POST', { pushToken }),
  sendTestNotification: () => apiCall('/users/test-notification', 'POST'),
};

export default { authAPI, groupAPI, messageAPI, userAPI };
