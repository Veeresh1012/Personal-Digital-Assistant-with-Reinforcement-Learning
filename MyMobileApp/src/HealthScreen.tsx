// src/HealthScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceInputButton from './VoiceInputButton';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import RNPickerSelect from 'react-native-picker-select';

interface HealthLog {
  id: string;
  metric: string;
  value: string;
  notes: string;
  date: any;
}

export default function HealthScreen() {
  const [metric, setMetric] = useState('weight');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'health_logs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const logsData: HealthLog[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          logsData.push({
            ...data as HealthLog,
            id: doc.id,
          });
        });
        setHealthLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching health logs:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load health logs.');
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddLog = async () => {
    if (!value.trim()) {
      Alert.alert('Missing Info', 'Enter a value or note.');
      return;
    }

    try {
      await addDoc(collection(db, 'health_logs'), {
        metric: metric,
        value: value.trim(),
        notes: notes.trim(),
        date: serverTimestamp(),
      });
      setValue('');
      setNotes('');
      Alert.alert('Success', 'Health log saved!');
    } catch (error) {
      console.error('Error adding health log:', error);
      Alert.alert('Error', 'Failed to save log. Please try again.');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No health logs yet.</Text>
      <Text style={styles.emptySubtext}>Start tracking your health!</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="blue" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Health & Vitals</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Log</Text>
        <RNPickerSelect
          onValueChange={setMetric}
          value={metric}
          items={[
            { label: 'Weight (kg)', value: 'weight' },
            { label: 'Blood Pressure', value: 'bp' },
            { label: 'Symptom Note', value: 'symptom' },
          ]}
          style={pickerSelectStyles}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputWithButton]}
            placeholder="Value / Detail (e.g., 75 kg or Headache)"
            value={value}
            onChangeText={setValue}
          />
          <VoiceInputButton
            onResult={(text) => setValue((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.notesInput, styles.inputWithButton]}
            placeholder="Notes (e.g., Felt tired)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <VoiceInputButton
            onResult={(text) => setNotes((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>
        <Button title="Save Log" onPress={handleAddLog} />
      </View>

      <Text style={styles.listTitle}>Recent Logs</Text>
      <FlatList
        data={healthLogs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
              <Text style={styles.itemText}>[{item.metric}] {item.value}</Text>
              {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  inputWithButton: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
    marginTop: 4,
  },
  itemNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    marginBottom: 16,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    marginBottom: 16,
  },
});
