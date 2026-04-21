// src/VoiceInputButton.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dynamically import Voice to handle cases where it's not available
let Voice: any = null;
let isVoiceAvailable = false;

try {
  Voice = require('@react-native-voice/voice').default;
  isVoiceAvailable = Voice !== null && typeof Voice.start === 'function';
} catch (error) {
  console.warn('Voice module not available:', error);
  isVoiceAvailable = false;
}

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInputButton({ onResult, disabled = false }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(isVoiceAvailable);

  useEffect(() => {
    if (!isAvailable || !Voice) {
      return;
    }

    const onSpeechStart = () => {
      setIsRecording(true);
      setError(null);
    };

    const onSpeechEnd = () => {
      setIsRecording(false);
    };

    const onSpeechResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        // Get the best result with highest confidence
        let bestResult = e.value[0];
        if (e.value.length > 1) {
          // If multiple results, pick the longest one (usually more accurate)
          bestResult = e.value.reduce((prev: string, current: string) => 
            current.length > prev.length ? current : prev
          );
        }
        onResult(bestResult.trim());
      }
      setIsRecording(false);
    };
    
    const onSpeechPartialResults = (e: any) => {
      // Handle partial results for better user feedback
      if (e.value && e.value.length > 0) {
        console.log('Partial result:', e.value[0]);
      }
    };

    const onSpeechError = (e: any) => {
      console.error('Speech error:', e);
      setError(e.error?.message || 'Speech recognition error');
      setIsRecording(false);
      if (e.error?.code !== '7' && e.error?.code !== '6') {
        Alert.alert('Voice Input Error', e.error?.message || 'Failed to recognize speech. Please try again.');
      }
    };

    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      if (Voice) {
        Voice.removeAllListeners();
        Voice.destroy().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [onResult, isAvailable]);

  const startRecording = async () => {
    if (!isAvailable || !Voice) {
      Alert.alert(
        'Voice Not Available',
        'Voice recognition requires a development build. Please build the app using "expo run:android" or "expo run:ios" instead of Expo Go.'
      );
      return;
    }

    try {
      setError(null);
      // Check if already recording
      if (isRecording) {
        await Voice.stop();
      }
      
      // Better voice recognition settings
      await Voice.start('en-US', {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_CALLING_PACKAGE: 'com.domain.app',
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: true,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      });
    } catch (err: any) {
      console.error('Error starting voice recognition:', err);
      setError(err?.message || 'Unknown error');
      setIsRecording(false);
      
      // Provide helpful error messages
      if (err?.message?.includes('permission') || err?.code === 'permission_denied') {
        Alert.alert('Permission Required', 'Please grant microphone permission in your device settings.');
      } else if (err?.message?.includes('null') || err?.message?.includes('startSpeech')) {
        Alert.alert(
          'Voice Not Available',
          'Voice recognition requires a development build. Please build the app using "expo run:android" or "expo run:ios".'
        );
      } else {
        Alert.alert('Error', 'Failed to start voice recognition. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    if (!isAvailable || !Voice) {
      return;
    }

    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping voice recognition:', err);
      setIsRecording(false);
    }
  };

  const handlePress = () => {
    if (!isAvailable) {
      Alert.alert(
        'Voice Not Available',
        'Voice recognition requires a development build. Please build the app using "expo run:android" or "expo run:ios" instead of Expo Go.'
      );
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // If voice is not available, show a disabled button
  if (!isAvailable) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.buttonDisabled]}
        onPress={handlePress}
        disabled={true}
      >
        <Ionicons name="mic-off" size={20} color="#fff" />
        <Text style={styles.buttonText}>Voice</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, isRecording && styles.buttonRecording, disabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled}
    >
      {isRecording ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name="mic" size={20} color="#fff" />
      )}
      <Text style={styles.buttonText}>{isRecording ? 'Listening...' : 'Voice'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonRecording: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
});
