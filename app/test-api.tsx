import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import axios from 'axios';

export default function TestAPIScreen() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...');
    try {
      const response = await axios.get('http://192.168.1.7:5000/api/health', {
        timeout: 10000,
      });
      setResult('✅ SUCCESS: ' + JSON.stringify(response.data));
    } catch (error: any) {
      setResult('❌ FAILED: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      <View style={styles.resultBox}>
        <Text style={styles.result}>{result}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={testConnection} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Testing...' : 'Retry'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultBox: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 100,
  },
  result: {
    fontSize: 14,
    color: '#000',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
