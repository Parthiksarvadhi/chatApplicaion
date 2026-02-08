import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { messageAPI, groupAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/services/socket';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: number;
  user_id: number;
  username: string;
  content: string;
  file_url?: string;
  created_at: string;
  reactions?: Array<{
    reaction_type: string;
    count: number;
    user_ids: number[];
    users?: Array<{ user_id: number; username: string }>;
  }>;
}

interface GroupMember {
  id: number;
  username: string;
  status: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<number | null>(null);
  const [reactionDetailsVisible, setReactionDetailsVisible] = useState(false);
  const [selectedReactionType, setSelectedReactionType] = useState<string | null>(null);
  const [reactionUsers, setReactionUsers] = useState<Array<{ user_id: number; username: string }>>([]);
  const reactionTapTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const flatListRef = useRef<FlatList>(null);
  const socket = getSocket();

  useEffect(() => {
    loadChatData();
    setupSocketListeners();

    return () => {
      if (socket) {
        socket.emit('leave_group', parseInt(id as string));
      }
    };
  }, [id]);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestPhotoLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const pickImageFromGallery = async () => {
    try {
      const hasPermission = await requestPhotoLibraryPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera roll permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setImagePreviewVisible(true);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setImagePreviewVisible(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage) return;

    try {
      setUploadingImage(true);
      const fileName = `image_${Date.now()}.jpg`;
      
      console.log('📸 Uploading image:', fileName);
      const response = await messageAPI.sendImage(parseInt(id as string), selectedImage, fileName);
      
      console.log('📤 Image upload response:', response);
      console.log('📤 Response data:', response.data);
      console.log('📤 Response data.data:', response.data?.data);
      console.log('📤 File URL from response:', response.data?.data?.file_url);

      // Emit via socket for real-time delivery
      if (socket) {
        const messageToSend = {
          id: response.data?.data?.id || Date.now(),
          user_id: user?.id || 0,
          username: user?.username || 'You',
          content: '[Image]',
          file_url: response.data?.data?.file_url,
          created_at: new Date().toISOString(),
        };
        
        console.log('📨 Emitting message via Socket.IO:', messageToSend);
        
        socket.emit('send_message', {
          groupId: parseInt(id as string),
          message: messageToSend,
        });
      }

      setSelectedImage(null);
      setImagePreviewVisible(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Send image error:', error);
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddReaction = async (reactionType: string) => {
    if (!selectedMessageForReaction) return;

    try {
      console.log('😊 Adding reaction:', { messageId: selectedMessageForReaction, reactionType });
      await messageAPI.addReaction(selectedMessageForReaction, reactionType);

      // Emit via socket for real-time delivery
      if (socket) {
        socket.emit('message_reaction', {
          groupId: parseInt(id as string),
          messageId: selectedMessageForReaction,
          reactionType,
          action: 'add',
        });
      }

      setReactionPickerVisible(false);
      setSelectedMessageForReaction(null);
    } catch (error) {
      console.error('Add reaction error:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  const handleReactionBadgeTap = async (messageId: number, reactionType: string, users: Array<{ user_id: number; username: string }>) => {
    const tapKey = `${messageId}-${reactionType}`;
    const currentMessage = messages.find(m => m.id === messageId);
    const userReactions = currentMessage?.reactions?.filter((r) => r.user_ids?.includes(user?.id || 0)) || [];
    const hasUserReacted = userReactions.some((r) => r.reaction_type === reactionType);
    
    // Clear existing timer if any
    if (reactionTapTimers.current[tapKey]) {
      clearTimeout(reactionTapTimers.current[tapKey]);
      delete reactionTapTimers.current[tapKey];
      
      // Long press/double tap detected - show who reacted
      console.log('👆 Long press detected - showing reaction details');
      setSelectedReactionType(reactionType);
      setReactionUsers(users);
      setReactionDetailsVisible(true);
    } else {
      // First tap - remove reaction if user has it
      console.log('👆 Single tap - checking if user has reaction:', { hasUserReacted, reactionType });
      
      if (hasUserReacted) {
        console.log('👆 Removing reaction:', reactionType);
        try {
          await messageAPI.removeReaction(messageId, reactionType);
          
          // Emit via socket for real-time delivery
          if (socket) {
            socket.emit('message_reaction', {
              groupId: parseInt(id as string),
              messageId: messageId,
              reactionType,
              action: 'remove',
            });
          }
        } catch (error) {
          console.error('Remove reaction error:', error);
          Alert.alert('Error', 'Failed to remove reaction');
        }
      }
      
      // Set timer for long press detection (500ms)
      reactionTapTimers.current[tapKey] = setTimeout(() => {
        delete reactionTapTimers.current[tapKey];
      }, 500);
    }
  };

  const handleRemoveReaction = async (reactionType: string) => {
    if (!selectedMessageForReaction) return;

    try {
      console.log('😊 Removing reaction:', { messageId: selectedMessageForReaction, reactionType });
      await messageAPI.removeReaction(selectedMessageForReaction, reactionType);

      // Emit via socket for real-time delivery
      if (socket) {
        socket.emit('message_reaction', {
          groupId: parseInt(id as string),
          messageId: selectedMessageForReaction,
          reactionType,
          action: 'remove',
        });
      }

      setReactionPickerVisible(false);
      setSelectedMessageForReaction(null);
    } catch (error) {
      console.error('Remove reaction error:', error);
      Alert.alert('Error', 'Failed to remove reaction');
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    // REMOVE OLD LISTENERS FIRST to prevent duplicates
    socket.off('new_message');
    socket.off('user_joined');
    socket.off('user_left');
    socket.off('presence_update');
    socket.off('reaction_update');

    socket.emit('join_group', parseInt(id as string));

    socket.on('new_message', (data: any) => {
      console.log('📨 New message received:', data);
      console.log('📨 Message has file_url?', !!data.file_url);
      console.log('📨 Message content:', data.content);
      setMessages((prev) => [...prev, data]);
    });

    socket.on('user_joined', (data: any) => {
      console.log('User joined:', data);
      loadMembers();
    });

    socket.on('user_left', (data: any) => {
      console.log('User left:', data);
      loadMembers();
    });

    socket.on('presence_update', (data: any) => {
      console.log('Presence update:', data);
      loadMembers();
    });

    socket.on('reaction_update', (data: any) => {
      console.log('😊 Reaction update received:', data);
      // Update message reactions in real-time
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === data.messageId) {
            // Reload reactions for this message
            loadMessageReactions(msg.id);
          }
          return msg;
        })
      );
    });
  };

  const loadChatData = async () => {
    try {
      setLoading(true);
      const [groupRes, messagesRes, membersRes] = await Promise.all([
        groupAPI.getGroupDetails(parseInt(id as string)),
        messageAPI.getMessages(parseInt(id as string)),
        groupAPI.getGroupMembers(parseInt(id as string)),
      ]);
      setGroupName(groupRes.data.name);
      
      // Load reactions for each message
      const messagesWithReactions = await Promise.all(
        messagesRes.data.map(async (msg: Message) => {
          try {
            const reactionsRes = await messageAPI.getReactions(msg.id);
            return { ...msg, reactions: reactionsRes.data };
          } catch (err) {
            console.error('Failed to load reactions for message', msg.id);
            return { ...msg, reactions: [] };
          }
        })
      );
      
      setMessages(messagesWithReactions);
      setMembers(membersRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load chat');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await groupAPI.getGroupMembers(parseInt(id as string));
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadMessageReactions = async (messageId: number) => {
    try {
      const response = await messageAPI.getReactions(messageId);
      console.log('😊 Loaded reactions for message', messageId, ':', response.data);
      
      // Update the message with reactions
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return { ...msg, reactions: response.data };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error('Failed to load reactions:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setSending(true);
      const response = await messageAPI.sendMessage(parseInt(id as string), messageText);
      
      console.log('Message response:', response);

      // Emit via socket for real-time delivery
      if (socket) {
        socket.emit('send_message', {
          groupId: parseInt(id as string),
          message: {
            id: response.data?.data?.id || Date.now(),
            user_id: user?.id || 0,
            username: user?.username || 'You',
            content: messageText,
            created_at: new Date().toISOString(),
          },
        });
      }

      setMessageText('');
      // REMOVED: Manual message addition - Socket.IO will handle it via 'new_message' event

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.user_id === user?.id;
    const isImageMessage = !!item.file_url;
    const userReactions = item.reactions?.filter((r) => r.user_ids?.includes(user?.id || 0)) || [];

    console.log('🖼️ Rendering message:', { 
      id: item.id, 
      content: item.content, 
      file_url: item.file_url, 
      isImageMessage 
    });

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
        {isImageMessage ? (
          // Image message - with container for sender info and timestamp
          <View>
            <View style={[styles.imageMessageContainer, isOwnMessage && styles.imageMessageContainerOwn]}>
              {!isOwnMessage && <Text style={styles.senderName}>{item.username}</Text>}
              
              <TouchableOpacity
                onPress={() => {
                  setFullScreenImage(`http://192.168.2.28:5000${item.file_url}`);
                  setFullScreenImageVisible(true);
                }}
                onLongPress={() => {
                  setSelectedMessageForReaction(item.id);
                  setReactionPickerVisible(true);
                }}
                delayLongPress={500}
              >
                <Image
                  source={{ uri: `http://192.168.2.28:5000${item.file_url}` }}
                  style={styles.messageImage}
                  resizeMode="contain"
                  onLoad={() => console.log('✅ Image loaded:', item.file_url)}
                  onError={(error) => console.log('❌ Image load error:', error, item.file_url)}
                />
              </TouchableOpacity>

              <Text style={styles.timestamp}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Reactions Display - Below image */}
            {item.reactions && item.reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {item.reactions.map((reaction, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.reactionBadge,
                      userReactions.some((r) => r.reaction_type === reaction.reaction_type) &&
                        styles.reactionBadgeActive,
                    ]}
                    onPress={() => handleReactionBadgeTap(item.id, reaction.reaction_type, reaction.users || [])}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.reaction_type}</Text>
                    <Text style={styles.reactionCount}>{reaction.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          // Text message - with bubble container
          <View>
            <TouchableOpacity
              onLongPress={() => {
                setSelectedMessageForReaction(item.id);
                setReactionPickerVisible(true);
              }}
              delayLongPress={500}
            >
              <View
                style={[
                  styles.messageBubble,
                  isOwnMessage ? styles.ownBubble : styles.otherBubble,
                ]}
              >
                {!isOwnMessage && <Text style={styles.senderName}>{item.username}</Text>}
                
                <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                  {item.content}
                </Text>
                
                <Text style={styles.timestamp}>
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Reactions Display - Below text */}
            {item.reactions && item.reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {item.reactions.map((reaction, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.reactionBadge,
                      userReactions.some((r) => r.reaction_type === reaction.reaction_type) &&
                        styles.reactionBadgeActive,
                    ]}
                    onPress={() => handleReactionBadgeTap(item.id, reaction.reaction_type, reaction.users || [])}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.reaction_type}</Text>
                    <Text style={styles.reactionCount}>{reaction.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMemberItem = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberBadge}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: item.status === 'online' ? '#34C759' : '#999' },
        ]}
      />
      <Text style={styles.memberName} numberOfLines={1}>
        {item.username}
      </Text>
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Members List */}
      <View style={styles.membersContainer}>
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.membersList}
        />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => (item?.id ? item.id.toString() : `msg-${index}`)}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={takePhotoWithCamera}
          disabled={sending || uploadingImage}
        >
          <Ionicons name="camera" size={20} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={pickImageFromGallery}
          disabled={sending || uploadingImage}
        >
          <Ionicons name="image" size={20} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          editable={!sending && !uploadingImage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (sending || uploadingImage || !messageText.trim()) && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={sending || uploadingImage || !messageText.trim()}
        >
          {sending || uploadingImage ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preview Image</Text>
              <TouchableOpacity
                onPress={() => setImagePreviewVisible(false)}
                disabled={uploadingImage}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setImagePreviewVisible(false)}
                disabled={uploadingImage}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.sendImageBtn, uploadingImage && styles.sendImageBtnDisabled]}
                onPress={handleSendImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.sendImageBtnText}>Send Image</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Image Viewer Modal */}
      <Modal
        visible={fullScreenImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImageVisible(false)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullScreenImageVisible(false)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>

          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal
        visible={reactionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.reactionPickerOverlay}
          onPress={() => setReactionPickerVisible(false)}
        >
          <View style={styles.reactionPickerContainer}>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => handleAddReaction('👍')}
            >
              <Text style={styles.reactionOptionText}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => handleAddReaction('❤️')}
            >
              <Text style={styles.reactionOptionText}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => handleAddReaction('😂')}
            >
              <Text style={styles.reactionOptionText}>😂</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => handleAddReaction('😮')}
            >
              <Text style={styles.reactionOptionText}>😮</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => handleAddReaction('😢')}
            >
              <Text style={styles.reactionOptionText}>😢</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => handleAddReaction('🔥')}
            >
              <Text style={styles.reactionOptionText}>🔥</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reaction Details Modal - Shows who reacted */}
      <Modal
        visible={reactionDetailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReactionDetailsVisible(false)}
      >
        <View style={styles.reactionDetailsOverlay}>
          <View style={styles.reactionDetailsContainer}>
            {/* Header */}
            <View style={styles.reactionDetailsHeader}>
              <Text style={styles.reactionDetailsTitle}>
                {selectedReactionType} Reactions
              </Text>
              <TouchableOpacity onPress={() => setReactionDetailsVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Users List */}
            <ScrollView style={styles.reactionDetailsList}>
              {reactionUsers.length === 0 ? (
                <Text style={styles.reactionDetailsEmpty}>No reactions yet</Text>
              ) : (
                reactionUsers.map((user, index) => (
                  <View key={index} style={styles.reactionDetailsUser}>
                    <Ionicons name="person-circle" size={40} color="#007AFF" />
                    <Text style={styles.reactionDetailsUsername}>{user.username}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  membersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  membersList: {
    paddingHorizontal: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  memberName: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
    maxWidth: 80,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  // ========== MESSAGE BUBBLE CONTAINER ==========
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    // CUSTOMIZE: Change borderRadius to make corners more/less rounded (0 = square, 20 = very round)
    // CUSTOMIZE: Change paddingHorizontal/paddingVertical to add more/less space inside bubble
  },
  // Other user's message bubble - CUSTOMIZE backgroundColor to change color
  otherBubble: {
    backgroundColor: 'white', // Change to any color like '#e8e8e8', '#f0f0f0', '#e3f2fd'
    // CUSTOMIZE: Add borderWidth: 1, borderColor: '#ddd' to add border
  },
  // Your own message bubble - CUSTOMIZE backgroundColor to change color
  ownBubble: {
    backgroundColor: '#007AFF', // Change to any color like '#34C759', '#FF9500', '#FF3B30'
  },

  // ========== TEXT STYLES ==========
  // Sender name above message - CUSTOMIZE color to change text color
  senderName: {
    fontSize: 12, // Change to 10, 14, 16 to make text smaller/larger
    fontWeight: '600', // Change to '400', '700', '800' to make text lighter/bolder
    color: '#666', // Change to any color like '#000', '#007AFF', '#999'
    marginBottom: 4, // Change to add more/less space below sender name
  },
  // Message text color for other users - CUSTOMIZE color to change text color
  messageText: {
    fontSize: 14, // Change to 12, 16, 18 to make text smaller/larger
    color: '#000', // Change to any color like '#333', '#666', '#007AFF'
  },
  // Message text color for your own messages - CUSTOMIZE color to change text color
  ownMessageText: {
    color: 'white', // Change to any color like '#000', '#333', '#f0f0f0'
  },
  // Timestamp below message - CUSTOMIZE color to change text color
  timestamp: {
    fontSize: 11, // Change to 9, 10, 12 to make text smaller/larger
    color: '#999', // Change to any color like '#666', '#aaa', '#007AFF'
    marginTop: 4, // Change to add more/less space above timestamp
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
    color: '#000',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  // ========== IMAGE MESSAGE STYLES ==========
  messageImage: {
    width: 280, // Change to 200, 250, 300 to make image smaller/larger
    height: 280, // Change to 200, 250, 300 to make image smaller/larger
    borderRadius: 12, // Change to 0, 8, 20 to make corners more/less rounded
    marginVertical: 8, // Change to add more/less space above/below image
    // CUSTOMIZE: Add backgroundColor: '#f0f0f0' to add background color behind image
    // CUSTOMIZE: Add borderWidth: 2, borderColor: '#007AFF' to add colored border around image
borderWidth: 1,
    backgroundColor: '#f1c0daff'
  },
  // Container for image messages - holds sender name, image, and timestamp
  imageMessageContainer: {
    maxWidth: '80%', // Change to '70%', '90%', '100%' to make container wider/narrower
    paddingHorizontal: 0,
    paddingRight:'10%', // Change to 8, 12, 16 to add padding inside container
    paddingVertical: '5%', // Change to 4, 8, 12 to add padding inside container
    // CUSTOMIZE: Add backgroundColor: '#f0f0f0' to add background color to container
    // CUSTOMIZE: Add borderWidth: 1, borderColor: '#ddd' to add border around container
    // CUSTOMIZE: Add borderRadius: 12 to round the container corners
  },
  // Align own image messages to the right
  imageMessageContainerOwn: {
    alignSelf: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  previewImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
    marginVertical: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  sendImageBtn: {
    backgroundColor: '#007AFF',
  },
  sendImageBtnDisabled: {
    opacity: 0.6,
  },
  sendImageBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ========== REACTION STYLES ==========
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8, // Change to add more/less space above reactions
    gap: 4, // Change to 2, 6, 8 to adjust space between reaction badges
  },
  // Individual reaction badge - CUSTOMIZE colors and styling
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Change to any color like '#fff', '#e8e8e8', '#f5f5f5'
    borderRadius: 12, // Change to 0, 8, 20 to make corners more/less rounded
    paddingHorizontal: 8, // Change to add more/less horizontal padding
    paddingVertical: 4, // Change to add more/less vertical padding
    borderWidth: 1, // Change to 0, 2, 3 to remove/add/thicken border
    borderColor: '#ddd', // Change to any color like '#ccc', '#999', '#007AFF'
  },
  // Active reaction badge (when you've reacted) - CUSTOMIZE colors
  reactionBadgeActive: {
    backgroundColor: '#e3f2fd', // Change to any color like '#fff9c4', '#f3e5f5', '#e0f2f1'
    borderColor: '#007AFF', // Change to any color like '#34C759', '#FF9500', '#FF3B30'
  },
  reactionEmoji: {
    fontSize: 14, // Change to 12, 16, 18 to make emoji smaller/larger
    marginRight: 4, // Change to add more/less space between emoji and count
  },
  reactionCount: {
    fontSize: 12, // Change to 10, 14, 16 to make count text smaller/larger
    color: '#666', // Change to any color like '#000', '#999', '#007AFF'
    fontWeight: '600', // Change to '400', '700', '800' to make text lighter/bolder
  },
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  reactionOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  reactionOptionText: {
    fontSize: 28,
  },
  // ========== REACTION DETAILS MODAL STYLES ==========
  reactionDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reactionDetailsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 16,
  },
  reactionDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reactionDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  reactionDetailsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reactionDetailsEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  reactionDetailsUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reactionDetailsUsername: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginLeft: 12,
  },
});
