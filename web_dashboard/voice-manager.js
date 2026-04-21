// Enhanced Voice Configuration for Mitra AI
class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.voices = [];
        this.preferredVoice = null;
        
        this.initializeVoices();
        this.setupRecognition();
    }
    
    initializeVoices() {
        if (this.synthesis) {
            // Load voices
            const loadVoices = () => {
                this.voices = this.synthesis.getVoices();
                this.selectBestVoice();
            };
            
            loadVoices();
            this.synthesis.onvoiceschanged = loadVoices;
        }
    }
    
    selectBestVoice() {
        // Priority: Google > Microsoft > Native English voices
        const priorities = [
            (voice) => voice.name.includes('Google') && voice.lang.includes('en'),
            (voice) => voice.name.includes('Microsoft') && voice.lang.includes('en'),
            (voice) => voice.lang.includes('en-US'),
            (voice) => voice.lang.includes('en')
        ];
        
        for (const priority of priorities) {
            const voice = this.voices.find(priority);
            if (voice) {
                this.preferredVoice = voice;
                console.log('Selected voice:', voice.name);
                break;
            }
        }
    }
    
    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech Recognition not supported');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        
        // Optimal settings for better recognition
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 5;
        this.recognition.lang = 'en-US';
        
        // Add grammar hints for better recognition
        if ('webkitSpeechGrammarList' in window) {
            const grammar = '#JSGF V1.0; grammar commands; public <command> = log | add | show | create | delete | update | schedule | remind;';
            const speechRecognitionList = new window.webkitSpeechGrammarList();
            speechRecognitionList.addFromString(grammar, 1);
            this.recognition.grammars = speechRecognitionList;
        }
    }
    
    startListening(onResult, onError, onStatusChange) {
        if (!this.recognition) {
            onError('Speech recognition not available');
            return;
        }
        
        if (this.isListening) {
            this.stopListening();
        }
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        this.recognition.onstart = () => {
            this.isListening = true;
            onStatusChange('Listening...', true);
        };
        
        this.recognition.onresult = (event) => {
            finalTranscript = '';
            interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Show interim results
            if (interimTranscript) {
                onStatusChange('Processing: ' + interimTranscript, true);
            }
            
            // Process final result
            if (finalTranscript) {
                const cleanedText = this.cleanTranscript(finalTranscript);
                onResult(cleanedText);
            }
        };
        
        this.recognition.onerror = (event) => {
            this.isListening = false;
            onStatusChange('Error', false);
            
            const errorMessages = {
                'no-speech': 'No speech detected. Please try again.',
                'audio-capture': 'Microphone not accessible. Check permissions.',
                'not-allowed': 'Microphone permission denied.',
                'network': 'Network error. Check your connection.',
                'aborted': 'Speech recognition aborted.',
                'bad-grammar': 'Grammar error in speech recognition.'
            };
            
            const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
            onError(message);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            onStatusChange('Ready', false);
        };
        
        try {
            this.recognition.start();
        } catch (error) {
            onError('Failed to start speech recognition: ' + error.message);
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    speak(text, onComplete) {
        if (!this.synthesis) {
            console.error('Speech synthesis not available');
            return;
        }
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Optimal settings for clarity
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }
        
        utterance.onstart = () => {
            this.isSpeaking = true;
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            if (onComplete) onComplete();
        };
        
        utterance.onerror = (event) => {
            this.isSpeaking = false;
            console.error('Speech synthesis error:', event.error);
        };
        
        this.synthesis.speak(utterance);
    }
    
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }
    
    cleanTranscript(text) {
        // Clean up common speech recognition errors
        return text
            .trim()
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/\b(uhm|uh|um|ah)\b/gi, '') // Remove filler words
            .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
    }
    
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !!window.speechSynthesis;
    }
}

// Export for use
window.VoiceManager = VoiceManager;