import { useState, useEffect } from 'react';

export function useSpeechRecognition(onResult) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript && onResult) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    // Store recognition instance for start/stop
    window.recognitionInstance = recognition;

    return () => {
      if (window.recognitionInstance) {
        window.recognitionInstance.stop();
      }
    };
  }, [onResult]);

  const startListening = () => {
    if (window.recognitionInstance && isSupported) {
      try {
        window.recognitionInstance.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        // If already running, stop and restart
        window.recognitionInstance.stop();
        setTimeout(() => window.recognitionInstance.start(), 100);
      }
    }
  };

  const stopListening = () => {
    if (window.recognitionInstance) {
      window.recognitionInstance.stop();
      setIsListening(false);
    }
  };

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    isSupported,
    setTranscript 
  };
}