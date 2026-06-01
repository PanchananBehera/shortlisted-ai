import { useState, useEffect, useRef } from 'react';

export function useRoboticVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Initialize AudioContext (lazy init for browser autoplay policies)
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }, []);

  // Resume audio context if suspended (required by Chrome autoplay policy)
  const ensureAudioContext = async () => {
    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.warn("Audio context resume failed (browser policy):", err);
      }
    }
  };

  // Play subtle mechanical beep
  const playRobotBeep = (frequency = 800, duration = 0.08) => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'square'; // Square wave = classic robot sound
    
    gainNode.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  const speak = async (text, onEnd) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      if (onEnd) onEnd();
      return;
    }

    // Ensure audio context is active
    await ensureAudioContext();

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get voices in real-time to avoid mount-time race condition (where state is initially empty)
    let availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      availableVoices = window.speechSynthesis.getVoices();
    }

    // 🤖 Find best robotic male/monotone voice (prioritize Mark and David, avoid Zira)
    const robotVoice = availableVoices.find(v => v.name.includes('Mark') || v.name.includes('Microsoft Mark')) ||
                       availableVoices.find(v => v.name.includes('David') || v.name.includes('Microsoft David')) ||
                       availableVoices.find(v => v.name.toLowerCase().includes('male')) ||
                       availableVoices.find(v => v.name.includes('Google US English')) ||
                       availableVoices.find(v => v.lang.startsWith('en') && !v.name.includes('Zira')) ||
                       availableVoices[0];
    
    if (robotVoice) utterance.voice = robotVoice;

    // 🎛️ ROBOTIC VOICE PARAMETERS
    utterance.rate = 0.82;    // Mechanical pacing
    utterance.pitch = 0.45;   // Deep, highly synthetic robotic pitch!
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      playRobotBeep(1200, 0.06); // Start beep
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      playRobotBeep(600, 0.1);   // End beep
      if (onEnd) onEnd();
    };
    
    utterance.onerror = (err) => {
      console.error('Speech synthesis error:', err);
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { speak, stopSpeaking, isSpeaking, voices };
}