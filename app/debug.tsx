import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Platform } from 'react-native';
import axios from 'axios';

export default function DebugScreen() {
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    checkConnectivity();
  }, []);

  const checkConnectivity = async () => {
    const urls = [
      'http://localhost:5000/api/health',
      'http://10.0.2.2:5000/api/health',
      'http://127.0.0.1:5000/api/health',
    ];

    const results: any = {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      tests: {},
    };

    for (const url of urls) {
      try {
        const response = await axios.get(url, { timeout: 5000 });
        results.tests[url] = { status: 'SUCCESS', data: response.data };
      } catch (error: any) {
        results.tests[url] = { status: 'FAILED', error: error.message };
      }
    }

    setStatus(results);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Info</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Platform:</Text>
        <Text style={styles.value}>{status.platform}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Timestamp:</Text>
        <Text style={styles.value}>{status.timestamp}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Connection Tests:</Text>
        {status.tests &&
          Object.entries(status.tests).map(([url, result]: any) => (
            <View key={url} style={styles.testResult}>
              <Text style={styles.url}>{url}</Text>
              <Text
                style={[
                  styles.testStatus,
                  result.status === 'SUCCESS' ? styles.success : styles.failed,
                ]}
              >
                {result.status}
              </Text>
              {result.error && <Text style={styles.error}>{result.error}</Text>}
            </View>
          ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={checkConnectivity}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
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
  },
  section: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#000',
    marginTop: 4,
  },
  testResult: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginTop: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  testStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  success: {
    color: '#34C759',
  },
  failed: {
    color: '#FF3B30',
  },
  error: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
