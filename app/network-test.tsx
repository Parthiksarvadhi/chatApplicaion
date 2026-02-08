import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';

export default function NetworkTestScreen() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testURL = async (url: string) => {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      return { success: true, status: response.status, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        errno: error.errno,
      };
    }
  };

  const runTests = async () => {
    setLoading(true);
    const urls = [
      'http://192.168.1.7:5000/api/health',
      'http://192.168.1.7:5000/api/auth/login',
      'http://localhost:5000/api/health',
      'http://10.0.2.2:5000/api/health',
    ];

    const testResults: any = {};
    for (const url of urls) {
      testResults[url] = await testURL(url);
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Diagnostic Test</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={runTests}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Run Tests</Text>
        )}
      </TouchableOpacity>

      {Object.entries(results).map(([url, result]: any) => (
        <View key={url} style={styles.resultCard}>
          <Text style={styles.url}>{url}</Text>
          {result.success ? (
            <>
              <Text style={[styles.status, styles.success]}>✅ SUCCESS</Text>
              <Text style={styles.detail}>Status: {result.status}</Text>
              <Text style={styles.detail}>Data: {JSON.stringify(result.data)}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.status, styles.error]}>❌ FAILED</Text>
              <Text style={styles.detail}>Error: {result.error}</Text>
              <Text style={styles.detail}>Code: {result.code}</Text>
              {result.errno && <Text style={styles.detail}>Errno: {result.errno}</Text>}
            </>
          )}
        </View>
      ))}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Troubleshooting:</Text>
        <Text style={styles.infoText}>
          • If 192.168.1.7 fails: Phone not on same WiFi or firewall blocking
        </Text>
        <Text style={styles.infoText}>
          • If localhost fails: Expected on physical device
        </Text>
        <Text style={styles.infoText}>
          • If 10.0.2.2 fails: Expected on physical device (Android emulator only)
        </Text>
        <Text style={styles.infoText}>
          • Check backend is running: npm run dev in backend folder
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  success: {
    color: '#34C759',
    borderLeftColor: '#34C759',
  },
  error: {
    color: '#FF3B30',
    borderLeftColor: '#FF3B30',
  },
  detail: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
});
