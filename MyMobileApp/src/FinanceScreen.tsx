// src/FinanceScreen.tsx
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

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: any;
}

export default function FinanceScreen() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'finance_expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const expenseData: Expense[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          expenseData.push({
            ...data as Expense,
            id: doc.id,
            amount: Number(data.amount),
          });
        });
        setExpenses(expenseData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching expenses:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load expenses.');
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddExpense = async () => {
    if (!amount.trim() || !category.trim()) {
      Alert.alert('Missing Info', 'Enter amount and category.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    try {
      await addDoc(collection(db, 'finance_expenses'), {
        amount: numAmount,
        category: category.trim(),
        date: serverTimestamp(),
      });
      setAmount('');
      setCategory('');
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No expenses logged yet.</Text>
      <Text style={styles.emptySubtext}>Start tracking your spending!</Text>
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
      <Text style={styles.title}>Finance Tracker</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Log Expense</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g., 45.50)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputWithButton]}
            placeholder="Category (e.g., Food, Rent)"
            value={category}
            onChangeText={setCategory}
          />
          <VoiceInputButton
            onResult={(text) => setCategory((prev) => prev ? `${prev} ${text}` : text)}
          />
        </View>
        <Button title="Add Expense" onPress={handleAddExpense} />
      </View>

      {expenses.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Total Expenses: ${totalExpenses.toFixed(2)}</Text>
        </View>
      )}

      <Text style={styles.listTitle}>Recent Transactions</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.itemText}>${item.amount.toFixed(2)}</Text>
            <Text style={styles.itemText}>{item.category}</Text>
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
    alignItems: 'center',
    marginBottom: 10,
  },
  inputWithButton: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  summaryCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
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
