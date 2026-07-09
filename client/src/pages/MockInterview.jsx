import React, { useState, useEffect, useRef } from 'react';
import InterviewScene from '../components/InterviewScene';
import { useTypewriter } from '../hooks/useTypewriter';
import { useRoboticVoice } from '../hooks/useRoboticVoice';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioRecorder } from '../hooks/useAudioRecorder'; // ✅ NEW: Audio recording
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
// ✅ Gamification imports
import { useGamification } from '../hooks/useGamification';
import { GamificationBar } from '../components/gamification/GamificationBar';
import { AchievementModal } from '../components/gamification/AchievementModal';
// ✅ WebSocket imports for real-time coaching
import { 
  initSocket, 
  joinInterviewRoom, 
  requestCoaching, 
  onCoachingHint, 
  onCoachingError,
  disconnectSocket 
} from '../utils/socket';

export default function MockInterview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Avatar state
  const [avatarState, setAvatarState] = useState('idle');
  
  // Conversation state
  const [conversation, setConversation] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewStage, setInterviewStage] = useState('setup');
  
  // Custom Session State
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [dreamCompany, setDreamCompany] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [questionCount, setQuestionCount] = useState(0);
  const [feedbackData, setFeedbackData] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState(null);

  // ✅ NEW: Session & Recording State
  const [sessionId, setSessionId] = useState(null);
  const [liveHints, setLiveHints] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // ✅ Gamification state
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementData, setAchievementData] = useState(null);

  // Refs to prevent double-render startup race conditions
  const hasStartedRef = useRef(false);
  const firstQuestionAskedRef = useRef(false);
  const startTimeRef = useRef(null);
  const coachingUnsubscribesRef = useRef([]);

  // Hooks
  const { speak, stopSpeaking, isSpeaking } = useRoboticVoice();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // ✅ Gamification hook
  const { progress, loading: gamificationLoading, refreshProgress } = useGamification(user?._id);
  
  // ✅ Audio recording hook
  const {
    isRecording: isAudioRecording,
    recordingTime,
    formattedTime,
    audioBlob,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    cancelRecording,
    resetRecording
  } = useAudioRecorder();

  // Fetch target role from user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get('/user/profile');
        if (res.data?.success && res.data?.profile?.jobTitle) {
          setTargetRole(res.data.profile.jobTitle);
        }
      } catch (err) {
        console.log("Could not load target role from profile, defaulting.");
      }
    };
    fetchUserProfile();
  }, []);

  // ✅ Initialize WebSocket & join interview room when interview starts
  useEffect(() => {
    if (user?.token && interviewStage !== 'setup' && interviewStage !== 'completed') {
      // Initialize socket with auth token
      const socket = initSocket(user.token);
      
      // Generate session ID for this interview
      const currentSessionId = `session_${user._id}_${Date.now()}`;
      setSessionId(currentSessionId);
      
      // Join the interview room for real-time coaching
      joinInterviewRoom(currentSessionId);
      
      // Set up coaching hint listener
      const unsubscribeHint = onCoachingHint((hint) => {
        setLiveHints(prev => [...prev.slice(-4), { // Keep last 5 hints
          id: Date.now(),
          ...hint,
          acknowledged: false
        }]);
        
        // Show toast notification
        showCoachingToast(hint.hint, hint.category);
      });
      
      // Set up error listener
      const unsubscribeError = onCoachingError((error) => {
        console.warn('Coaching error:', error);
      });
      
      // Store cleanup functions
      coachingUnsubscribesRef.current = [unsubscribeHint, unsubscribeError];
      
      // Cleanup on unmount or interview end
      return () => {
        coachingUnsubscribesRef.current.forEach(unsub => unsub?.());
        // Don't disconnect socket here - keep it alive for dashboard
      };
    }
  }, [user?.token, interviewStage]);

  // ✅ Typewriter effect - Faster (15ms) + fixes double-message bug
  const { displayedText, isTyping } = useTypewriter(
    currentMessage,
    15,
    () => {
      setAvatarState('talking');
      // ✅ Enable input immediately when PacoBot STARTS speaking
      if (interviewStage === 'asking') {
        setInterviewStage('ready');
      }
    },
    () => {
      setAvatarState('idle');
      // ✅ Fix double-message: Update last AI message to isTyping: false when done
      setConversation(prev => {
        const lastIdx = prev.length - 1;
        if (lastIdx >= 0 && prev[lastIdx].role === 'ai' && prev[lastIdx].isTyping) {
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx], isTyping: false };
          return updated;
        }
        return prev;
      });
      // Focus input when ready
      if (interviewStage === 'ready') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  );

  // Speech recognition
  const handleSpeechResult = (transcript) => {
    setUserAnswer(transcript);
  };

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    isSupported: isSpeechSupported 
  } = useSpeechRecognition(handleSpeechResult);

  // Update user answer from voice
  useEffect(() => {
    if (transcript) {
      setUserAnswer(transcript);
    }
  }, [transcript]);

  // Auto-scroll conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [conversation, displayedText]);

  // Focus input when ready
  useEffect(() => {
    if (interviewStage === 'ready' && !isTyping) {
      inputRef.current?.focus();
    }
  }, [interviewStage, isTyping]);

  // Start interview
  useEffect(() => {
    if (user && interviewStage === 'intro' && conversation.length === 0) {
      startInterview();
    }
  }, [user, interviewStage]);

  // ✅ FIXED: Start interview with proper flow + AUTO RECORDING
  const startInterview = async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    startTimeRef.current = Date.now();

    // ✅ AUTO-START RECORDING when interview begins
    try {
      await startAudioRecording();
      setIsRecording(true);
      console.log('🎙️ Recording started automatically');
    } catch (err) {
      console.error('Failed to start recording:', err);
      // Show user-friendly message
      alert('🎤 Microphone access needed to record your session! Please allow permissions and try again.');
    }

    const introMessage = `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your AI career coach. Let's begin the mock interview for the ${targetRole} position${dreamCompany ? ` at ${dreamCompany}` : ''}.`;
    setCurrentMessage(introMessage);
    setConversation([{ role: 'ai', content: introMessage, isTyping: true }]);
    setInterviewStage('asking');
    
    // ✅ Speak with callback to ask first question AFTER intro finishes
    speak(introMessage, () => {
      if (!firstQuestionAskedRef.current) {
        firstQuestionAskedRef.current = true;
        setTimeout(() => askQuestion(0), 800);
      }
    });
  };

  // ✅ FIXED: Ask question function - prevents double rendering
  const askQuestion = (index) => {
    if (index >= 5) {
      endInterview();
      return;
    }
    
    // Dynamic questions based on role
    const questions = [
      `Tell me about yourself and your experience as a ${targetRole}.`,
      "Can you describe a challenging project you've worked on and how you overcame obstacles?",
      `What are your greatest strengths and how do they apply to this ${targetRole} role?`,
      "Where do you see yourself in 5 years in your career?",
      `Why should we hire you for this ${targetRole} position${dreamCompany ? ` at ${dreamCompany}` : ''}?`
    ];
    
    const question = questions[index] || questions[0];
    
    // ✅ FIXED: Set currentMessage ONLY - typewriter handles display
    setCurrentMessage(question);
    // ✅ Add to conversation with isTyping: true so UI shows typewriter effect
    setConversation(prev => [...prev, { role: 'ai', content: question, isTyping: true }]);
    setInterviewStage('asking');
    
    // ✅ Speak the question
    speak(question);
    
    // ✅ Request real-time coaching hint for this question
    if (sessionId && userAnswer) {
      requestCoaching(sessionId, userAnswer, question);
    }
  };

  // ✅ Show real-time coaching hint as toast notification
  const showCoachingToast = (hint, category) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl border shadow-2xl animate-slide-in ${
      category === 'structure' ? 'bg-blue-900/90 border-blue-500/50' :
      category === 'content' ? 'bg-emerald-900/90 border-emerald-500/50' :
      category === 'delivery' ? 'bg-purple-900/90 border-purple-500/50' :
      'bg-amber-900/90 border-amber-500/50'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-2xl">
          ${category === 'structure' ? '🏗️' : category === 'content' ? '🎯' : category === 'delivery' ? '🗣️' : '💪'}
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-white mb-1">AI Coaching Tip</p>
          <p class="text-xs text-slate-200">${hint}</p>
        </div>
        <button class="text-slate-400 hover:text-white text-lg" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 8000);
  };

  // ✅ FIXED: Handle user answer - proper backend integration WITH GAMIFICATION + COACHING
  const handleSendAnswer = async () => {
    if (!userAnswer.trim() || isLoading || interviewStage !== 'ready') return;

    const userResponse = userAnswer;
    
    // Add user message to conversation (users don't use typewriter)
    const updatedConversation = [...conversation, { role: 'user', content: userResponse }];
    setConversation(updatedConversation);
    setUserAnswer('');
    setIsLoading(true);
    setInterviewStage('processing');
    setAvatarState('thinking');

    try {
      // Check if we've completed 5 questions
      if (questionCount >= 5) {
        // Final evaluation
        const evalRes = await api.post('/ai/interview/evaluate', {
          conversation: updatedConversation,
          targetRole: targetRole,
          jobDescription: jobDescription,
          dreamCompany: dreamCompany,
          experienceLevel: experienceLevel
        });

        if (evalRes.data.success) {
          const evalReport = evalRes.data.interview.feedback;
          setFeedbackData(evalReport);
          setInterviewStage('completed');
          setAvatarState('nodding');
          
          const closingMessage = `Excellent job! 🎉 I've evaluated your interview. Your score: ${evalReport.overallScore || 80}/100. Check the detailed feedback below!`;
          
          setCurrentMessage(closingMessage);
          setConversation(prev => [...prev, { role: 'ai', content: closingMessage, isTyping: true }]);
          speak(closingMessage, () => setAvatarState('idle'));

          // Compute duration
          const endTime = Date.now();
          const diffMs = startTimeRef.current ? endTime - startTimeRef.current : 0;
          const diffSecs = Math.floor(diffMs / 1000);
          const minutes = Math.floor(diffSecs / 60);
          const seconds = diffSecs % 60;
          const durationStr = `${minutes}m ${seconds}s`;

          // Stop audio recording if active
          let finalAudioBlob = audioBlob;
          if (isAudioRecording) {
            finalAudioBlob = await stopAudioRecording();
          }

          // Save the interview session + trigger gamification
          try {
            const saveRes = await api.post('/interview/sessions', {
              userId: user?._id || user?.id,
              targetRole,
              dreamCompany,
              experienceLevel,
              overallScore: evalReport.overallScore || 80,
              questionCount: 5,
              duration: durationStr,
              strengths: evalReport.strengths || [],
              weaknesses: evalReport.weaknesses || [],
              suggestions: evalReport.suggestions || [],
              detailedAssessment: evalReport.detailedAssessment || [],
              roadmap: evalReport.roadmap || []
            });
            
            // ✅ GAMIFICATION: Handle response if present
            if (saveRes.data.gamification) {
              setAchievementData(saveRes.data.gamification);
              setShowAchievement(true);
              refreshProgress(); // Update gamification UI
            }
            
            // ✅ Upload audio recording if available
            if (finalAudioBlob && sessionId && saveRes.data.session?._id) {
              try {
                const formData = new FormData();
                formData.append('audio', finalAudioBlob, `session_${sessionId}.webm`);
                
                const uploadRes = await api.post('/audio/upload', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (uploadRes.data.success) {
                  // Update session with audio reference
                  await api.patch(`/interview/sessions/${saveRes.data.session._id}`, {
                    audioRecordingUrl: uploadRes.data.fileId,
                    recordingDuration: recordingTime
                  });
                  console.log('✅ Audio recording saved');
                }
              } catch (err) {
                console.error('Failed to upload audio:', err);
                // Don't block session save if audio upload fails
              }
            }
          } catch (saveErr) {
            console.error('Failed to save interview session:', saveErr);
          }
        } else {
          throw new Error(evalRes.data.error || 'Evaluation failed');
        }
      } else {
        // Standard turn - get AI response
        const res = await api.post('/ai/interview/turn', {
          conversation: updatedConversation,
          targetRole: targetRole,
          jobDescription: jobDescription,
          dreamCompany: dreamCompany,
          experienceLevel: experienceLevel
        });

        if (res.data.success) {
          const aiReply = res.data.aiResponse;
          
          // ✅ Increment count BEFORE adding response
          setQuestionCount(prev => prev + 1);
          
          // ✅ FIXED: Set currentMessage ONLY - let typewriter handle display
          setCurrentMessage(aiReply);
          setConversation(prev => [...prev, { role: 'ai', content: aiReply, isTyping: true }]);
          setInterviewStage('asking');
          
          // ✅ Speak AI response
          speak(aiReply);
          
          // ✅ Request real-time coaching for next question
          if (sessionId && userResponse) {
            requestCoaching(sessionId, userResponse, aiReply);
          }
        } else {
          throw new Error(res.data.error || 'Failed to process turn');
        }
      }
    } catch (error) {
      console.error('Interview error:', error);
      // Fallback response
      const fallbackFeedback = "I experienced a brief timeout. Let's continue. Tell me about a specific project you've worked on recently.";
      setCurrentMessage(fallbackFeedback);
      setConversation(prev => [...prev, { role: 'ai', content: fallbackFeedback, isTyping: true }]);
      setInterviewStage('asking');
      setAvatarState('idle');
      speak(fallbackFeedback);
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = () => {
    const closingMessage = `Great job, ${user?.name?.split(' ')[0] || 'there'}! 🎉 Check your dashboard for detailed feedback.`;
    setCurrentMessage(closingMessage);
    setConversation(prev => [...prev, { role: 'ai', content: closingMessage, isTyping: true }]);
    setInterviewStage('completed');
    setAvatarState('nodding');
    speak(closingMessage, () => setAvatarState('idle'));
    
    // Stop recording if active
    if (isAudioRecording) {
      stopAudioRecording();
    }
    
    // Cleanup WebSocket listeners
    coachingUnsubscribesRef.current.forEach(unsub => unsub?.());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setUserAnswer('');
      startListening();
    }
  };

  const handleRecordingToggle = async () => {
    if (isAudioRecording) {
      await stopAudioRecording();
      setIsRecording(false);
    } else {
      await startAudioRecording();
      setIsRecording(true);
    }
  };

  // Determine if user can interact
  const canInteract = interviewStage === 'ready' && !isLoading && !isTyping;
  const isPacoBotSpeaking = interviewStage === 'asking' || isTyping;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      
      {/* ✅ Mobile-Optimized Sticky Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <h1 className="text-lg font-bold text-white">AI Mock Interview</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {interviewStage !== 'setup' && interviewStage !== 'completed' && (
              <span className="text-xs text-gray-400">
                Q<span className="text-green-400 font-bold">{Math.min(questionCount + 1, 5)}</span>/5
              </span>
            )}
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition min-h-[36px]"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* ✅ Mobile-Optimized Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
          
          {/* Left: Avatar + Status - Stacks on mobile */}
          <div className="space-y-3 lg:sticky lg:top-20">
            {/* Avatar Container - Responsive height */}
            <div className="h-48 sm:h-64 md:h-80 lg:h-96 bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <InterviewScene avatarState={avatarState} />
            </div>
            
            {/* Status Bar - Compact on mobile */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                avatarState === 'talking' ? 'bg-green-500 animate-pulse' :
                avatarState === 'thinking' ? 'bg-yellow-500 animate-pulse' :
                avatarState === 'nodding' ? 'bg-purple-500 animate-pulse' :
                'bg-blue-500 animate-pulse'
              }`} />
              <span className="truncate text-gray-300">
                {interviewStage === 'setup' ? '⚙️ Configuring...' : (
                  avatarState === 'talking' ? '🗣️ Speaking...' :
                  avatarState === 'thinking' ? '🤔 Thinking...' :
                  avatarState === 'nodding' ? '👍 Great job!' :
                  isListening ? '🔴 Recording...' : '👂 Listening...'
                )}
              </span>
              {isSpeaking && <span className="ml-auto text-xs text-green-400 font-bold">🔊</span>}
            </div>

            {/* ✅ NEW: Gamification Bar */}
            {!gamificationLoading && progress && <GamificationBar progress={progress} />}

            {/* Tips - Collapsible on mobile to save space */}
            <details className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <summary className="text-xs font-bold uppercase tracking-wider text-green-400 cursor-pointer select-none flex items-center gap-1">
                💡 Tips <span className="text-gray-500 transition-transform duration-200">▼</span>
              </summary>
              <ul className="text-xs text-gray-400 space-y-1 mt-2 pl-4">
                <li>• Use STAR method: Situation, Task, Action, Result</li>
                <li>• Speak naturally or type your answers</li>
                <li>• Be specific with metrics & examples</li>
              </ul>
            </details>
          </div>

          {/* Right: Chat + Input - Full width on mobile */}
          <div className="flex flex-col gap-3">
            
            {/* SETUP STAGE */}
            {interviewStage === 'setup' && (
              <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-xl space-y-6 animate-fade-in">
                <div className="space-y-1.5 border-b border-gray-700 pb-4">
                  <h2 className="text-xl font-bold text-white bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Configure Your PacoBot Session</h2>
                  <p className="text-xs text-gray-400">Specify your target role and goals to customize the mock interview questions.</p>
                </div>
                
                <div className="space-y-4">
                  {/* Job Role Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-green-400">Target Job Role</label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Software Engineer, Product Manager"
                      className="w-full bg-gray-900 border border-gray-750 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition duration-200"
                    />
                  </div>

                  {/* Dream Company Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-green-400">Dream Company (Optional)</label>
                    <input
                      type="text"
                      value={dreamCompany}
                      onChange={(e) => setDreamCompany(e.target.value)}
                      placeholder="e.g. Google, Stripe, Microsoft"
                      className="w-full bg-gray-900 border border-gray-750 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition duration-200"
                    />
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-green-400">Experience Level</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['junior', 'mid', 'senior'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setExperienceLevel(level)}
                          className={`py-2.5 rounded-lg border font-semibold text-sm capitalize transition ${
                            experienceLevel === level
                              ? 'bg-green-600 border-green-500 text-white shadow-md shadow-green-900/20'
                              : 'bg-gray-900 border-gray-750 text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Job Description Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-green-400">Job Description / Requirements (Optional)</label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description or core skills here to get tailored interview questions from PacoBot..."
                      rows={4}
                      className="w-full bg-gray-900 border border-gray-750 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition duration-200 font-sans resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setInterviewStage('intro')}
                  disabled={!targetRole.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5"
                >
                  Start Mock Interview 🚀
                </button>
              </div>
            )}

            {/* CONVERSATION STAGE */}
            {interviewStage !== 'completed' && interviewStage !== 'setup' && (
              <div className="flex flex-col gap-3">
                
                {/* ✅ Live Coaching Hints Panel */}
                {liveHints.length > 0 && (
                  <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400">💡 AI Coaching Tips</span>
                      <button 
                        onClick={() => setLiveHints([])}
                        className="text-xs text-slate-400 hover:text-white transition"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {liveHints.map((hint) => (
                        <div 
                          key={hint.id}
                          className={`text-xs p-2 rounded-lg border ${
                            hint.category === 'structure' ? 'bg-blue-900/30 border-blue-500/30' :
                            hint.category === 'content' ? 'bg-emerald-900/30 border-emerald-500/30' :
                            hint.category === 'delivery' ? 'bg-purple-900/30 border-purple-500/30' :
                            'bg-amber-900/30 border-amber-500/30'
                          }`}
                        >
                          <span className="font-semibold text-white">
                            {hint.category === 'structure' ? '🏗️ Structure:' : 
                             hint.category === 'content' ? '🎯 Content:' : 
                             hint.category === 'delivery' ? '🗣️ Delivery:' : '💪 Confidence:'}
                          </span>
                          <span className="text-slate-200 ml-2">{hint.hint}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Chat Area - Viewport relative height for mobile */}
                <div className="bg-gray-800 rounded-xl p-3 h-[45vh] sm:h-[55vh] md:h-[450px] overflow-y-auto space-y-3 border border-gray-700 hide-scrollbar">
                  {conversation.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[92%] sm:max-w-[85%] px-3 py-2.5 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-green-600 text-white rounded-br-none' 
                          : 'bg-gray-700 text-gray-100 rounded-bl-none border border-gray-600'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.isTyping && msg.role === 'ai' && idx === conversation.length - 1 
                            ? displayedText 
                            : msg.content}
                          {msg.isTyping && msg.role === 'ai' && idx === conversation.length - 1 && (
                            <span className="inline-block w-1.5 h-4 bg-green-400 ml-1 animate-pulse align-middle" />
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-2xl rounded-bl-none flex items-center gap-2">
                        <span className="text-xs text-gray-400">Processing...</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Controls - Mobile optimized with larger touch targets */}
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 space-y-2.5">
                  <div className="flex gap-2">
                    
                    {/* ✅ Audio Recording Toggle */}
                    <button
                      onClick={handleRecordingToggle}
                      disabled={!canInteract}
                      className={`p-3 rounded-lg transition shrink-0 flex items-center justify-center text-xl min-w-[44px] min-h-[44px] ${
                        isAudioRecording 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-655'
                      } disabled:opacity-40`}
                      title={isAudioRecording ? "Stop recording" : "Record session for playback"}
                      aria-label={isAudioRecording ? "Stop recording" : "Start recording"}
                    >
                      {isAudioRecording ? '⏹️' : '⏺️'}
                    </button>
                    
                    {/* Recording Timer */}
                    {isAudioRecording && (
                      <span className="text-xs text-red-400 font-mono animate-pulse flex items-center">
                        REC {formattedTime}
                      </span>
                    )}
                    
                    {/* Microphone - 44px min touch target */}
                    <button
                      onClick={handleMicToggle}
                      disabled={!canInteract || !isSpeechSupported}
                      className={`p-3 rounded-lg transition shrink-0 flex items-center justify-center text-xl min-w-[44px] min-h-[44px] ${
                        isListening 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-655'
                      } disabled:opacity-40`}
                      title={isListening ? "Stop voice capture" : "Speak with microphone"}
                      aria-label={isListening ? "Stop recording" : "Start recording"}
                    >
                      {isListening ? '🔴' : '🎤'}
                    </button>
                    
                    {/* Text Input - Full width, proper mobile keyboard */}
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isPacoBotSpeaking ? "PacoBot speaking..." :
                        interviewStage === 'processing' ? "Analyzing..." :
                        "Type or tap 🎤 to speak..."
                      }
                      disabled={!canInteract}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 min-h-[44px]"
                    />
                    
                    {/* Send Button - 44px min touch target */}
                    <button
                      onClick={handleSendAnswer}
                      disabled={!userAnswer.trim() || !canInteract}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg flex items-center justify-center text-lg min-w-[44px] min-h-[44px]"
                      aria-label="Send answer"
                    >
                      {isLoading ? '⏳' : '➤'}
                    </button>
                  </div>
                  
                  {/* Helper Text - Small but readable */}
                  {!isSpeechSupported && (
                    <p className="text-[10px] text-yellow-500 text-center">⚠️ Voice not supported in this browser</p>
                  )}
                  <p className="text-[10px] text-gray-500 text-center">💡 Tip: Use STAR method (Situation, Task, Action, Result)</p>
                </div>
              </div>
            )}

            {/* COMPLETED & EVALUATION DASHBOARD */}
            {interviewStage === 'completed' && feedbackData && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Score Banner */}
                <div className="bg-gradient-to-br from-green-950/40 to-gray-800 rounded-2xl p-6 border border-green-500/20 text-center space-y-4 shadow-xl">
                  <div className="inline-block relative">
                    <div className="w-28 h-28 rounded-full border-4 border-gray-700 flex flex-col items-center justify-center bg-gray-900 shadow-lg">
                      <span className="text-3xl font-extrabold text-green-400">{feedbackData.overallScore || 0}%</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Score</span>
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-500/60 animate-ping opacity-25" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-2xl font-bold text-white">Interview Complete!</h3>
                    <p className="text-sm text-gray-300">
                      PacoBot has evaluated your answers for the <span className="text-green-400 font-bold">{targetRole}</span> position.
                    </p>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-750 space-y-3 shadow-md">
                    <h4 className="font-extrabold text-green-400 flex items-center gap-2 text-sm uppercase tracking-wider">💪 Top Strengths</h4>
                    <ul className="text-sm text-gray-300 space-y-2.5">
                      {feedbackData.strengths?.map((str, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start leading-relaxed">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>{str}</span>
                        </li>
                      ))}
                      {(!feedbackData.strengths || feedbackData.strengths.length === 0) && (
                        <li className="text-gray-450 italic text-xs">No specific strengths recorded.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-750 space-y-3 shadow-md">
                    <h4 className="font-extrabold text-red-400 flex items-center gap-2 text-sm uppercase tracking-wider">⚠️ Growth Gaps</h4>
                    <ul className="text-sm text-gray-300 space-y-2.5">
                      {feedbackData.weaknesses?.map((weak, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start leading-relaxed">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{weak}</span>
                        </li>
                      ))}
                      {(!feedbackData.weaknesses || feedbackData.weaknesses.length === 0) && (
                        <li className="text-gray-450 italic text-xs">No specific weaknesses identified.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-750 space-y-3 shadow-md">
                  <h4 className="font-extrabold text-blue-400 flex items-center gap-2 text-sm uppercase tracking-wider">💡 PacoBot's Core Suggestions</h4>
                  <ul className="text-sm text-gray-300 space-y-2.5">
                    {feedbackData.suggestions?.map((sug, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start leading-relaxed">
                        <span className="text-blue-400 font-bold">🎯</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                    {(!feedbackData.suggestions || feedbackData.suggestions.length === 0) && (
                      <li className="text-gray-450 italic text-xs">No specific recommendations provided.</li>
                    )}
                  </ul>
                </div>

                {/* Accordion: Detailed Assessment */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider flex items-center gap-2">📝 Question-by-Question Assessment</h4>
                  <div className="space-y-3">
                    {feedbackData.detailedAssessment?.map((item, idx) => (
                      <div key={idx} className="bg-gray-805 rounded-xl border border-gray-750 overflow-hidden shadow-sm">
                        <button
                          onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                          className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-gray-75 transition"
                        >
                          <div className="space-y-1 pr-4 flex-1 min-w-0">
                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Round {idx + 1}</span>
                            <p className="font-semibold text-white text-sm truncate">{item.question}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2.5 py-1 bg-green-950 text-green-400 text-xs font-black rounded-lg border border-green-900/30">
                              {item.score || 0}%
                            </span>
                            <span className="text-gray-400 font-bold text-xs">{activeAccordion === idx ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {activeAccordion === idx && (
                          <div className="px-5 py-5 border-t border-gray-755 bg-gray-900/40 space-y-4 text-sm leading-relaxed">
                            
                            <div className="space-y-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Your Response:</span>
                              <p className="text-gray-300 italic border-l-2 border-gray-600 pl-3">"{item.answer}"</p>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Constructive Evaluation:</span>
                              <p className="text-gray-300">{item.assessment}</p>
                            </div>

                            <div className="bg-green-950/20 rounded-lg p-4 border border-green-900/20 space-y-1">
                              <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider block">PacoBot's Ideal STAR Answer:</span>
                              <p className="text-gray-300 italic">"{item.idealAnswer}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 90-Day Roadmap */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider flex items-center gap-2">🗺️ Your 90-Day Growth Roadmap</h4>
                  <div className="space-y-3">
                    {feedbackData.roadmap?.map((step, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-xl p-4.5 border border-gray-750 flex items-start gap-4 shadow-md">
                        <div className="w-8 h-8 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center font-black text-green-400 text-sm shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <strong className="text-white text-sm font-bold truncate">{step.skill}</strong>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase border shrink-0 ${
                              step.priority === 'Critical' ? 'bg-red-950 text-red-400 border-red-900/30' :
                              step.priority === 'Important' ? 'bg-yellow-950 text-yellow-400 border-yellow-900/30' :
                              'bg-green-950 text-green-400 border-green-900/30'
                            }`}>
                              {step.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed pr-2">{step.actionStep}</p>
                          <span className="text-[10px] text-gray-400 block mt-1">⏱️ Estimated duration: <span className="text-green-400 font-medium">{step.timeEstimate}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  {audioBlob && (
                    <button
                      onClick={() => {
                        const url = window.URL.createObjectURL(audioBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        const date = new Date().toISOString().split('T')[0];
                        const safeRole = targetRole.replace(/\s+/g, '_');
                        a.download = `Interview_${safeRole}_${date}.webm`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg transition text-center shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                    >
                      📥 Download
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setConversation([]);
                      setQuestionCount(0);
                      setFeedbackData(null);
                      
                      // Reset refs for a fresh session
                      hasStartedRef.current = false;
                      firstQuestionAskedRef.current = false;
                      
                      setInterviewStage('setup');
                    }}
                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold rounded-lg transition text-center shadow-lg shadow-green-900/20"
                  >
                    Practice Again 🎯
                  </button>
                  
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-655 text-white font-bold rounded-lg border border-gray-600 transition text-center"
                  >
                    Back to Dashboard
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      </main>

      {/* ✅ NEW: Achievement Modal */}
      <AchievementModal 
        show={showAchievement} 
        onClose={() => setShowAchievement(false)} 
        {...achievementData} 
      />
    </div>
  );
}