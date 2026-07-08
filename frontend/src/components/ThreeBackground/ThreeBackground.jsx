import { Float, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

function GymShape({ position, scale = 1, rotation = [0, 0, 0], color = '#10b981', speed = 1 }) {
  const groupRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current || reducedMotion) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    groupRef.current.rotation.y = rotation[1] + Math.sin(elapsed * 0.18 * speed) * 0.12 + pointer.x * 0.1;
    groupRef.current.rotation.x = rotation[0] + Math.cos(elapsed * 0.14 * speed) * 0.08 - pointer.y * 0.06;
    groupRef.current.position.y = position[1] + Math.sin(elapsed * 0.35 * speed) * 0.12;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1.4, 0.16, 0.16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[-0.86, 0, 0]}>
        <boxGeometry args={[0.22, 0.56, 0.56]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0.86, 0, 0]}>
        <boxGeometry args={[0.22, 0.56, 0.56]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.42} />
      </mesh>
    </group>
  );
}

function AmbientRings() {
  const ringRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useFrame(({ clock, pointer }) => {
    if (!ringRef.current || reducedMotion) {
      return;
    }

    ringRef.current.rotation.z = clock.getElapsedTime() * 0.04;
    ringRef.current.rotation.x = pointer.y * 0.08;
    ringRef.current.rotation.y = pointer.x * 0.08;
  });

  return (
    <group ref={ringRef} position={[0.2, -0.1, -1.4]}>
      <mesh>
        <torusGeometry args={[2.4, 0.01, 12, 96]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[0.35, 0.2, 0.8]}>
        <torusGeometry args={[1.65, 0.008, 12, 96]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

function Scene() {
  const shapes = useMemo(
    () => [
      { position: [-2.1, 0.75, 0], rotation: [0.1, 0.4, -0.28], scale: 0.86, color: '#10b981', speed: 0.9 },
      { position: [1.75, -0.15, -0.35], rotation: [-0.25, -0.3, 0.24], scale: 0.72, color: '#14b8a6', speed: 1.15 },
      { position: [0.5, 1.3, -1.2], rotation: [0.2, -0.7, 0.2], scale: 0.52, color: '#475569', speed: 0.75 },
    ],
    [],
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5.3]} fov={42} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 4, 5]} intensity={1.3} />
      <pointLight position={[-3, 2, 2]} intensity={1.2} color="#10b981" />
      <AmbientRings />
      {shapes.map((shape) => (
        <Float key={shape.position.join(',')} speed={1.2} rotationIntensity={0.18} floatIntensity={0.28}>
          <GymShape {...shape} />
        </Float>
      ))}
    </>
  );
}

class ThreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function Fallback() {
  return (
    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))]" />
  );
}

function ThreeBackground({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-2xl ${className}`} aria-hidden="true">
      <Fallback />
      <ThreeErrorBoundary fallback={<Fallback />}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}

export default ThreeBackground;

