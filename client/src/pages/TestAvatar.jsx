import { useState } from 'react';
import InterviewScene from '../components/InterviewScene';

export default function TestAvatar() {
  const [avatarState, setAvatarState] = useState('idle');

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-3xl font-bold text-white text-center mb-8">
        🎭 AI Avatar Test
      </h1>
      
      {/* 3D Avatar Scene */}
      <InterviewScene avatarState={avatarState} />
      
      {/* Manual Controls for Testing */}
      <div className="flex gap-4 justify-center mt-6 flex-wrap">
        <button 
          onClick={() => setAvatarState('idle')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            avatarState === 'idle' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          😐 Idle
        </button>
        <button 
          onClick={() => setAvatarState('talking')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            avatarState === 'talking' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          💬 Talking
        </button>
        <button 
          onClick={() => setAvatarState('nodding')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            avatarState === 'nodding' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          👍 Nodding
        </button>
      </div>
      
      <p className="text-center text-gray-400 mt-4 text-sm">
        Click buttons to test avatar animations
      </p>
    </div>
  );
}