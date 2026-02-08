# Chat App - Complete Structure

## Overview
A production-ready React Native chat application with real-time messaging, group management, and online/offline presence tracking.

## Features

### ✅ Authentication
- User registration and login
- JWT token-based authentication
- Persistent login with AsyncStorage
- Secure logout

### ✅ Groups/Classrooms
- Create new groups
- Join existing groups
- View all available groups in Explore tab
- Group member management with roles (admin/member)

### ✅ Real-Time Messaging
- Send and receive messages instantly via Socket.IO
- Message history with pagination
- Sender information displayed
- Timestamps for all messages

### ✅ Online/Offline Status
- Real-time presence tracking
- Online status indicator for group members
- Automatic status updates on connect/disconnect

### ✅ User Profiles
- View user profile information
- Display username, email, bio, location, phone
- Profile management

## App Structure

```
chatapp/
├── app/
│   ├── _layout.tsx              # Root layout with auth routing
│   ├── login.tsx                # Login screen
│   ├── register.tsx             # Registration screen
│   ├── create-group.tsx         # Create group screen
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation
│   │   ├── home.tsx             # Your chats (joined groups)
│   │   ├── explore.tsx          # All available groups
│   │   └── profile.tsx          # User profile
│   └── chat/
│       └── [id].tsx             # Chat screen with real-time messaging
├── services/
│   ├── api.ts                   # REST API client (fetch-based)
│   └── socket.ts                # Socket.IO real-time client
├── context/
│   └── AuthContext.tsx          # Authentication context
└── ...
```

## Key Technologies

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Real-Time**: Socket.IO client
- **State Management**: React Context API
- **Storage**: AsyncStorage for tokens
- **HTTP Client**: Fetch API (native)
- **UI**: React Native components + Ionicons

## API Endpoints Used

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups` - List user's groups
- `POST /api/groups/:id/join` - Join group
- `GET /api/groups/:id` - Get group details
- `GET /api/groups/:id/members` - Get group members

### Messages
- `POST /api/messages/:groupId/send` - Send message
- `GET /api/messages/:groupId` - Get messages
- `DELETE /api/messages/:id` - Delete message

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/groups/:groupId/presence` - Get group presence

## Socket.IO Events

### Client → Server
- `authenticate` - Authenticate socket connection
- `join_group` - Join a group room
- `leave_group` - Leave a group room
- `send_message` - Send real-time message
- `set_presence` - Update presence status

### Server → Client
- `authenticated` - Socket authenticated
- `new_message` - New message received
- `user_joined` - User joined group
- `user_left` - User left group
- `presence_update` - User presence changed
- `message_read_receipt` - Message read by user

## Screens

### 1. Login Screen
- Email and password input
- Auto-filled test credentials
- Link to registration
- Debug info toggle

### 2. Register Screen
- Username, email, password input
- Password confirmation
- Validation
- Auto-login after registration

### 3. Home Tab (Chats)
- List of joined groups
- Pull-to-refresh
- Create group FAB
- Logout button
- Empty state

### 4. Explore Tab
- Search groups by name
- Join groups
- View group details
- Pull-to-refresh

### 5. Profile Tab
- User information display
- Profile details (bio, location, phone)
- Logout button

### 6. Chat Screen
- Real-time message list
- Online members with status indicators
- Message input with send button
- Auto-scroll to latest message
- Sender information for each message

## Configuration

### Backend URL
Update in `services/api.ts` and `services/socket.ts`:
- **iOS Simulator**: `http://localhost:5000`
- **Android Emulator**: `http://10.0.2.2:5000`
- **Physical Device**: `http://YOUR_MACHINE_IP:5000`

Current: `http://192.168.1.7:5000`

## Running the App

```bash
# Install dependencies
cd chatapp
npm install

# Start Expo
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Run on web
npx expo start --web
```

## Testing

1. **Create Account**: Register with test credentials
2. **Create Group**: Use FAB on home tab
3. **Join Group**: Use Explore tab to find and join groups
4. **Send Messages**: Open chat and send real-time messages
5. **Check Presence**: See online/offline status of members
6. **Multi-Device**: Open app on multiple devices to see real-time updates

## Notes

- All network requests use fetch API (native React Native)
- Socket.IO handles real-time messaging and presence
- Authentication tokens stored securely in AsyncStorage
- Automatic reconnection on network loss
- Responsive design for all screen sizes
- Cross-platform (iOS, Android, Web)
