// src/FitnessScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import VoiceInputButton from './VoiceInputButton';

export default function FitnessScreen() {
  const [goalType, setGoalType] = useState('weight');
  const [goalValue, setGoalValue] = useState('');
  const [logExercise, setLogExercise] = useState('');
  const [logSets, setLogSets] = useState('');
  const [logReps, setLogReps] = useState('');

  const handleSetGoal = () => {
    if (!goalValue.trim()) {
      Alert.alert('Missing Value', 'Please enter a target value.');
      return;
    }
    const numValue = parseFloat(goalValue);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid positive number.');
      return;
    }
    console.log('GOAL SET:', { type: goalType, value: numValue });
    Alert.alert('Goal Set!', `Your ${goalType} goal: ${numValue}`);
    setGoalValue('');
  };

  const handleLogWorkout = () => {
    if (!logExercise.trim() || !logSets.trim() || !logReps.trim()) {
      Alert.alert('Missing Info', 'Please fill in all workout fields.');
      return;
    }
    const sets = parseInt(logSets);
    const reps = parseInt(logReps);
    if (isNaN(sets) || isNaN(reps) || sets <= 0 || reps <= 0) {
      Alert.alert('Invalid Values', 'Sets and reps must be positive numbers.');
      return;
    }
    console.log('WORKOUT LOGGED:', {
      exercise: logExercise,
      sets: sets,
      reps: reps,
    });
    Alert.alert('Workout Logged!', `${logExercise}: ${sets} sets × ${reps} reps`);
    setLogExercise('');
    setLogSets('');
    setLogReps('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Fitness Coach</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Set Your Goal</Text>
          <RNPickerSelect
            onValueChange={(value) => setGoalType(value)}
            value={goalType}
            items={[
              { label: 'Weight (kg)', value: 'weight' },
              { label: 'Daily Steps', value: 'steps' },
              { label: 'Daily Net Calories', value: 'calories' },
            ]}
            style={pickerSelectStyles}
          />
          <TextInput
            style={styles.input}
            placeholder="Target Value (e.g., 80)"
            value={goalValue}
            onChangeText={setGoalValue}
            keyboardType="numeric"
          />
          <Button title="Set Goal" onPress={handleSetGoal} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Log Workout</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputWithButton]}
              placeholder="Exercise (e.g., Push-ups)"
              value={logExercise}
              onChangeText={setLogExercise}
            />
            <VoiceInputButton
              onResult={(text) => setLogExercise((prev) => prev ? `${prev} ${text}` : text)}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Sets"
              value={logSets}
              onChangeText={setLogSets}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Reps"
              value={logReps}
              onChangeText={setLogReps}
              keyboardType="numeric"
            />
          </View>
          <Button title="Log Workout" onPress={handleLogWorkout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  scrollContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWithButton: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flexBasis: '48%',
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
