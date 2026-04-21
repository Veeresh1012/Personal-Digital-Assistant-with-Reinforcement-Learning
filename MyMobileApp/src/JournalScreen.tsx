// src/JournalScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import VoiceInputButton from './VoiceInputButton';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

interface JournalEntry {
  id: string;
  title: string;
  mood: string;
  content: string;
  createdAt: any;
}

export default function JournalScreen() {
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'journal'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const entriesData: JournalEntry[] = [];
        querySnapshot.forEach((doc) => {
          entriesData.push({ ...doc.data() as JournalEntry, id: doc.id });
        });
        setEntries(entriesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching entries:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load journal entries.');
      }
    );

    return () => unsubscribe();
  }, []);

  const clearForm = () => {
    setTitle('');
    setMood('');
    setContent('');
    setIsEditing(false);
    setCurrentEntryId('');
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing Info', 'Please fill in a title and some content.');
      return;
    }

    try {
      if (isEditing) {
        const entryDocRef = doc(db, 'journal', currentEntryId);
        await updateDoc(entryDocRef, {
          title: title.trim(),
          mood: mood,
          content: content.trim(),
          createdAt: serverTimestamp(),
        });
        Alert.alert('Success', 'Journal entry updated!');
      } else {
        await addDoc(collection(db, 'journal'), {
          title: title.trim(),
          mood: mood,
          content: content.trim(),
          createdAt: serverTimestamp(),
        });
        Alert.alert('Success', 'Journal entry saved!');
      }
      clearForm();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setIsEditing(true);
    setCurrentEntryId(entry.id);
    setTitle(entry.title);
    setMood(entry.mood);
    setContent(entry.content);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'journal', id));
              Alert.alert('Deleted', 'Journal entry has been deleted.');
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry.');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>My Journal</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isEditing ? 'Edit Entry' : 'New Entry'}</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputWithButton]}
            placeholder="Entry title (e.g., 'Project Breakthrough')"
            value={title}
            onChangeText={setTitle}
          />
          <VoiceInputButton
            onResult={(text) => setTitle((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>

        <RNPickerSelect
          onValueChange={(value) => setMood(value)}
          value={mood}
          placeholder={{ label: 'Select a mood...', value: null }}
          items={[
            { label: 'Happy', value: 'happy' },
            { label: 'Calm', value: 'calm' },
            { label: 'Focused', value: 'focused' },
            { label: 'Stressed', value: 'stressed' },
            { label: 'Sad', value: 'sad' },
          ]}
          style={pickerSelectStyles}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.contentArea, styles.inputWithButton]}
            placeholder="Write your thoughts..."
            value={content}
            onChangeText={setContent}
            multiline={true}
          />
          <VoiceInputButton
            onResult={(text) => setContent((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>

        <View style={styles.row}>
          {isEditing && (
            <Button title="Cancel" onPress={clearForm} color="gray" />
          )}
          <Button title={isEditing ? 'Update Entry' : 'Save Entry'} onPress={handleSave} />
        </View>
      </View>
      <Text style={styles.title}>Past Entries</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No journal entries yet.</Text>
      <Text style={styles.emptySubtext}>Start writing your thoughts!</Text>
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
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.entryItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.entryMood}>Mood: {item.mood || 'N/A'}</Text>
              <Text style={styles.entryContent}>{item.content}</Text>
            </View>
            <View style={styles.entryButtons}>
              <TouchableOpacity onPress={() => handleEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
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
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inputWithButton: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  contentArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  entryMood: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
    marginVertical: 4,
  },
  entryContent: {
    fontSize: 16,
    color: '#333',
  },
  entryButtons: {
    justifyContent: 'space-around',
    marginLeft: 10,
  },
  editText: {
    color: 'blue',
    marginBottom: 8,
  },
  deleteText: {
    color: 'red',
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
