import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper: Format seconds to MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SessionPlayback = ({ session, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const transcriptRef = useRef(null);
  const audioRef = useRef(null);

  // Construct audio URL (Assuming backend is running on port 5000 or using proxy)
  // If your API base URL is different, adjust this
  const audioUrl = session.audioRecordingUrl 
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/audio/stream/${session.audioRecordingUrl}` 
    : null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [session]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Sync transcript highlighting
      const index = session.transcript?.findIndex(seg => {
        const segStart = seg.timestamp / 1000;
        const segEnd = (seg.timestamp + 5000) / 1000; // Approximate 5s segments
        return currentTime >= segStart && currentTime < segEnd;
      });
      setActiveSegmentIndex(index !== -1 ? index : -1);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Auto-scroll transcript to active segment
  useEffect(() => {
    if (activeSegmentIndex !== -1 && transcriptRef.current) {
      const activeEl = transcriptRef.current.children[activeSegmentIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentIndex]);

  if (!session) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">🎙️</span> Interview Playback
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {session.targetRole} {session.dreamCompany && `@ ${session.dreamCompany}`} • {new Date(session.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition"
            >
              
            </button>
          </div>

          {/* Content Grid */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Audio Player & Stats */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Score Circle */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-300 mb-2">
                  {session.overallScore}%
                </div>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Overall Score</p>
              </div>

              {/* Audio Controls */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
                <audio 
                  ref={audioRef} 
                  src={audioUrl} 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={(e) => setDuration(e.target.duration)}
                  onEnded={() => setIsPlaying(false)}
                />
                
                {/* Progress Bar */}
                <div>
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 font-mono mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Play/Pause Button */}
                <button 
                  onClick={togglePlayPause}
                  className="w-16 h-16 mx-auto bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
              </div>

              {/* Coaching Hints */}
              {session.coachingHints?.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <span>💡</span> Coaching Tips
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1 hide-scrollbar">
                    {session.coachingHints.map((hint, idx) => (
                      <div key={idx} className="text-xs p-2 bg-slate-900/50 border border-slate-700 rounded-lg">
                        <span className="text-slate-400 font-semibold block mb-1">{hint.category}</span>
                        <span className="text-slate-200">{hint.hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Transcript */}
            <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700 rounded-2xl p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📜</span> Transcript
              </h3>
              
              <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
                {session.transcript?.map((seg, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      activeSegmentIndex === idx 
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10 scale-[1.02]' 
                        : 'bg-slate-900/30 border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                        seg.speaker === 'ai' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {seg.speaker === 'ai' ? ' PacoBot' : '👤 You'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatTime(seg.timestamp / 1000)}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      activeSegmentIndex === idx ? 'text-white' : 'text-slate-300'
                    }`}>
                      {seg.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SessionPlayback;