// src/App.tsx
import { useState, useEffect } from 'react';
import { db } from './firebase'; // Your database connection
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import 'regenerator-runtime/runtime'; // Required for react-speech-recognition
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// TypeScript type for a Todo
interface Todo {
  id: string;
  text: string;
  createdAt: any;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  // === "MOUTH" (Text-to-Speech) ===
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // === "EARS" (Speech-to-Text) ===
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // This effect syncs the voice transcript to your input box
  useEffect(() => {
    setInput(transcript);
  }, [transcript]);

  // === READ (Get To-Dos from Firebase) ===
  useEffect(() => {
    const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosData: Todo[] = [];
      querySnapshot.forEach((doc) => {
        todosData.push({ ...doc.data() as Todo, id: doc.id });
      });
      setTodos(todosData);
    });
    return () => unsubscribe();
  }, []);

  // === CREATE (Add a To-Do to Firebase) ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;

    try {
      await addDoc(collection(db, 'todos'), {
        text: input,
        createdAt: serverTimestamp()
      });
      // Speak a confirmation!
      speak(`OK. I added ${input} to your list.`);
      // Clear input and transcript
      setInput('');
      resetTranscript();
    } catch (error) {
      console.error("Error adding document: ", error);
      speak("Sorry, I couldn't add that. Please check the console.");
    }
  };

  // Show an error if the browser doesn't support speech
  if (!browserSupportsSpeechRecognition) {
    return <span>Sorry, your browser doesn't support speech recognition.</span>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      <h1>My Personal Assistant</h1>
      <h2>Real-Time To-Do List</h2>

      {/* Voice Status */}
      <p style={{ color: listening ? 'red' : 'green', fontWeight: 'bold' }}>
        {listening ? 'I am listening...' : 'Not listening'}
      </p>

      {/* Form for adding a new to-do */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={input} // Now controlled by both typing and voice
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or speak your task..."
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
        />
        {/* Voice Control Buttons */}
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => SpeechRecognition.startListening({ continuous: true })}>
            Start Listening
          </button>
          <button type="button" onClick={SpeechRecognition.stopListening}>
            Stop Listening
          </button>
          <button type="button" onClick={resetTranscript}>
            Clear Text
          </button>
        </div>
        
        {/* Submit Button */}
        <button type="submit" style={{ padding: '10px', marginTop: '10px' }}>
          Add Task
        </button>
      </form>

      {/* List of to-dos */}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {todos.map((todo) => (
          <li 
            key={todo.id} 
            style={{ 
              padding: '10px', 
              border: '1px solid #ccc', 
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;