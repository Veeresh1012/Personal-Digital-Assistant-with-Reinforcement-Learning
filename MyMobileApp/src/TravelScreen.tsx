// src/TravelScreen.tsx
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

interface TravelPlan {
  id: string;
  destination: string;
  notes: string;
  date: any;
}

export default function TravelScreen() {
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'travel_plans'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const plansData: TravelPlan[] = [];
        querySnapshot.forEach((doc) => {
          plansData.push({
            ...doc.data() as TravelPlan,
            id: doc.id,
          });
        });
        setPlans(plansData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching travel plans:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load travel plans.');
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddPlan = async () => {
    if (!destination.trim()) {
      Alert.alert('Missing Info', 'Enter a destination.');
      return;
    }

    try {
      await addDoc(collection(db, 'travel_plans'), {
        destination: destination.trim(),
        notes: notes.trim(),
        date: serverTimestamp(),
      });
      setDestination('');
      setNotes('');
      Alert.alert('Success', 'Travel plan saved!');
    } catch (error) {
      console.error('Error adding travel plan:', error);
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No travel plans yet.</Text>
      <Text style={styles.emptySubtext}>Start planning your next adventure!</Text>
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
      <Text style={styles.title}>Travel Planner</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plan a Trip</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputWithButton]}
            placeholder="Destination (e.g., Paris)"
            value={destination}
            onChangeText={setDestination}
          />
          <VoiceInputButton
            onResult={(text) => setDestination((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.notesInput, styles.inputWithButton]}
            placeholder="Itinerary / Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <VoiceInputButton
            onResult={(text) => setNotes((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>
        <Button title="Save Plan" onPress={handleAddPlan} />
      </View>

      <Text style={styles.listTitle}>Upcoming Plans</Text>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>{item.destination}</Text>
              {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
            </View>
            <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
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
    height: 80,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemDate: {
    fontSize: 14,
    color: 'blue',
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
