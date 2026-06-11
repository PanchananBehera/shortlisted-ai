import { useState, useEffect, useRef } from 'react';
import InterviewScene from '../components/InterviewScene';
import { useTypewriter } from '../hooks/useTypewriter';
import { useRoboticVoice } from '../hooks/useRoboticVoice';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

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

  // Refs to prevent double-render startup race conditions
  const hasStartedRef = useRef(false);
  const firstQuestionAskedRef = useRef(false);
  const startTimeRef = useRef(null);

  // Hooks
  const { speak, stopSpeaking, isSpeaking } = useRoboticVoice();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // ✅ FIXED: Start interview with proper flow
  const startInterview = () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    startTimeRef.current = Date.now();

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
  };

  // ✅ FIXED: Handle user answer - proper backend integration
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

          // Save the interview session
          try {
            await api.post('/interview/sessions', {
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
        </div>
      </main>
    </div>
  );
}