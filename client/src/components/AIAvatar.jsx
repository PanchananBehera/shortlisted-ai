import { useRef, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function AIAvatar({ currentState }) {
  const group = useRef();
  
  // ✅ Load PacoBot GLB model
  const { scene } = useGLTF('/avatar/pacobot.glb');
  
  // ✅ Refs for different parts of PacoBot
  const headRef = useRef();
  const armsRef = useRef();
  const wheelRef = useRef();
  const antennaRef = useRef();

  // ✅ State for dynamic auto-scaling and positioning
  const [scale, setScale] = useState(1);
  const [basePosition, setBasePosition] = useState([0, 0, 0]);

  // ✅ Find and store references to PacoBot's named nodes + auto-scale
  useEffect(() => {
    if (scene) {
      headRef.current = scene.getObjectByName('Cabeza');
      armsRef.current = scene.getObjectByName('Brazos');
      wheelRef.current = scene.getObjectByName('Rueda');
      antennaRef.current = scene.getObjectByName('Antena1');
      
      // Compute bounding box to auto-center and stand on floor (Y = -1.5)
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const targetHeight = 2.8;
      const scaleFactor = targetHeight / (size.y || 1);
      const floorY = -1.5;
      
      const posY = floorY - (box.min.y * scaleFactor);
      const posX = -(center.x * scaleFactor);
      const posZ = -(center.z * scaleFactor);

      setScale(scaleFactor);
      setBasePosition([posX, posY, posZ]);
    }
  }, [scene]);

  // ✅ Enhanced Gestures Animation Loop (60fps)
  useFrame((state) => {
    if (!scene) return;
    
    const time = state.clock.getElapsedTime();
    const [baseX, baseY, baseZ] = basePosition;
    
    // 🎭 EXPRESSED GESTURES based on state
    if (currentState === 'talking') {
      // 🗣️ TALKING: Energetic gestures with head tilts, arm waves, antenna wiggles
      const talkBob = Math.sin(time * 3) * 0.04;
      scene.position.y = THREE.MathUtils.lerp(scene.position.y, baseY + talkBob, 0.08);
      
      if (headRef.current) {
        // Head tilts side to side while talking
        const headTilt = Math.sin(time * 6) * 0.06;
        const headTurn = Math.sin(time * 2) * 0.08;
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headTilt + 0.03, 0.12);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, headTurn, 0.1);
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, Math.sin(time * 4) * 0.04, 0.08);
      }
      if (armsRef.current) {
        // Arms gesture up and down while talking
        const armGesture = Math.sin(time * 5) * 0.12;
        armsRef.current.rotation.x = THREE.MathUtils.lerp(armsRef.current.rotation.x, armGesture + 0.05, 0.12);
        armsRef.current.rotation.z = THREE.MathUtils.lerp(armsRef.current.rotation.z, Math.sin(time * 3) * 0.06, 0.08);
      }
      if (antennaRef.current) {
        // Antenna wiggles rapidly while talking (like excited transmission)
        antennaRef.current.rotation.z = Math.sin(time * 20) * 0.15;
        antennaRef.current.rotation.x = Math.sin(time * 15) * 0.08;
      }
      if (wheelRef.current) {
        // Wheel rotates steadily while talking
        wheelRef.current.rotation.x += 0.04;
      }
      
    } else if (currentState === 'nodding') {
      // 👍 NODDING: Clear encouraging nods with arm raises
      const nodBob = Math.sin(time * 2) * 0.02;
      scene.position.y = THREE.MathUtils.lerp(scene.position.y, baseY + nodBob, 0.08);
      
      if (headRef.current) {
        // Head nods up and down
        const nodAngle = Math.sin(time * 8) * 0.15;
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, nodAngle + 0.08, 0.15);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.08);
        headRef.current.rotation.z = 0;
      }
      if (armsRef.current) {
        // Arms raise slightly in encouragement
        const armRaise = Math.sin(time * 4) * 0.08;
        armsRef.current.rotation.x = THREE.MathUtils.lerp(armsRef.current.rotation.x, armRaise + 0.05, 0.1);
      }
      if (antennaRef.current) {
        // Antenna pulses with positive energy
        antennaRef.current.rotation.z = Math.sin(time * 12) * 0.1;
      }
      if (wheelRef.current) {
        wheelRef.current.rotation.x += 0.02;
      }
      
    } else if (currentState === 'thinking') {
      // 🤔 THINKING: Contemplative subtle movements
      const thinkBob = Math.sin(time * 1.5) * 0.015;
      scene.position.y = THREE.MathUtils.lerp(scene.position.y, baseY + thinkBob, 0.05);
      
      if (headRef.current) {
        // Head tilts slightly to the side (thinking pose)
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, Math.sin(time * 1) * 0.03, 0.05);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, Math.sin(time * 0.8) * 0.06, 0.05);
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0.05, 0.05);
      }
      if (armsRef.current) {
        // Arms stay relatively still while thinking
        armsRef.current.rotation.x = THREE.MathUtils.lerp(armsRef.current.rotation.x, 0, 0.05);
      }
      if (antennaRef.current) {
        // Antenna pulses slowly (processing)
        antennaRef.current.rotation.z = Math.sin(time * 3) * 0.04;
      }
      if (wheelRef.current) {
        wheelRef.current.rotation.x += 0.005;
      }
      
    } else {
      // 😐 IDLE: Very calm, professional, almost still (subtle "breathing")
      const idleBob = Math.sin(time * 0.8) * 0.01;
      scene.position.y = THREE.MathUtils.lerp(scene.position.y, baseY + idleBob, 0.03);
      
      if (headRef.current) {
        // Almost no head movement in idle - just micro adjustments
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 0.03);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, Math.sin(time * 0.4) * 0.02, 0.03);
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0, 0.03);
      }
      if (armsRef.current) {
        armsRef.current.rotation.x = THREE.MathUtils.lerp(armsRef.current.rotation.x, 0, 0.03);
        armsRef.current.rotation.z = THREE.MathUtils.lerp(armsRef.current.rotation.z, 0, 0.03);
      }
      if (antennaRef.current) {
        // Very slow gentle antenna wiggle
        antennaRef.current.rotation.z = Math.sin(time * 1.5) * 0.02;
        antennaRef.current.rotation.x = 0;
      }
      if (wheelRef.current) {
        wheelRef.current.rotation.x += 0.002;
      }
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive 
        object={scene} 
        position={basePosition}
        scale={scale}
        rotation={[0, -Math.PI / 2, 0]} // Face camera
      />
    </group>
  );
}

// ✅ Preload PacoBot for better performance
useGLTF.preload('/avatar/pacobot.glb');