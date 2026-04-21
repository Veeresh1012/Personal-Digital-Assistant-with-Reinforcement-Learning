// src/DayScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceInputButton from './VoiceInputButton';
import { DayScreenProps } from './types';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  doc,
  deleteDoc,
} from 'firebase/firestore';

interface Todo {
  id: string;
  text: string;
  createdAt: any;
}

export default function DayScreen({ route }: DayScreenProps) {
  const { day } = route.params;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'todos'),
      where('day', '==', day),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const todosData: Todo[] = [];
        querySnapshot.forEach((doc) => {
          todosData.push({ ...doc.data() as Todo, id: doc.id });
        });
        setTodos(todosData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching todos:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load todos.');
      }
    );
    return () => unsubscribe();
  }, [day]);

  const handleSubmit = async () => {
    if (input.trim() === '') {
      Alert.alert('Empty Task', 'Please enter a task.');
      return;
    }
    try {
      await addDoc(collection(db, 'todos'), {
        text: input.trim(),
        day: day,
        createdAt: serverTimestamp(),
      });
      setInput('');
    } catch (error) {
      console.error('Error adding todo:', error);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      Alert.alert('Error', 'Failed to delete task.');
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No tasks for {day} yet.</Text>
      <Text style={styles.emptySubtext}>Add your first task above!</Text>
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
      <Text style={styles.title}>{day}'s To-Do List</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your task..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
        />
        <VoiceInputButton
          onResult={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
        />
        <Button title="Add Task" onPress={handleSubmit} />
      </View>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <Text style={styles.todoText}>{item.text}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    paddingHorizontal: 16,
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
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  todoText: {
    fontSize: 16,
    flex: 1,
  },
  deleteText: {
    color: 'red',
    marginLeft: 10,
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
