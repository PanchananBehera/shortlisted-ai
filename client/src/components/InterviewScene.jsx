import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { AIAvatar } from './AIAvatar';

export default function InterviewScene({ avatarState }) {
  return (
    <div className="w-full h-96 bg-gradient-to-b from-gray-900 to-black rounded-xl overflow-hidden shadow-2xl border border-gray-700">
      <Canvas 
        // 🎥 Perfect framing: Centered eye-level camera view
        camera={{ position: [0, 0.5, 4.5], fov: 50 }} 
        shadows
      >
        {/* 💡 Brighter, Multi-Directional Lighting */}
        <ambientLight intensity={1.0} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.8} />
        <spotLight 
          position={[0, 12, 0]} 
          intensity={1.2} 
          angle={0.4} 
          penumbra={1} 
        />
        
        {/* 🤖 The Avatar */}
        <AIAvatar currentState={avatarState} />
        
        {/* 🌍 Environment & Ground */}
        <Environment preset="city" />
        <ContactShadows 
          position={[0, -1.5, 0]}  // Matches PacoBot's dynamically aligned base
          opacity={0.6} 
          scale={25} 
          blur={2.5} 
          far={12} 
        />
        
        {/* 🎥 Camera Controls (Locked for interview flow) */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          enableRotate={false}
          minPolarAngle={0.5}   // Allow looking slightly down
          maxPolarAngle={2.5}   // Allow looking slightly up
        />
      </Canvas>
    </div>
  );
}