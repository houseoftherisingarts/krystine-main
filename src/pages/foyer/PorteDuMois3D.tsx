import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, ContactShadows } from '@react-three/drei';
import type { Group } from 'three';

/**
 * La porte du mois en VRAIE 3D (GLB Meshy à partir de l'asset FLUX).
 * Charnière au bord gauche : le battant a de l'épaisseur, la lumière
 * tourne dessus, l'ombre de contact lui donne du poids.
 */

const MODEL = '/foyer/porte-septembre.glb';
const HALF_W = 0.62; // demi-largeur du modèle normalisé Meshy (h 1.9, ratio 640/984)

const Door: React.FC<{ open: boolean; hover: boolean }> = ({ open, hover }) => {
  const { scene } = useGLTF(MODEL, '/draco/');
  const pivot = useRef<Group>(null);
  const target = open ? -1.66 : hover ? -0.46 : 0;
  useFrame((_, dt) => {
    const g = pivot.current;
    if (!g) return;
    g.rotation.y += (target - g.rotation.y) * Math.min(1, dt * 3.4);
  });
  return (
    <group position={[-HALF_W, 0, 0]}>
      <group ref={pivot}>
        <primitive object={scene} position={[HALF_W, 0, 0]} />
      </group>
    </group>
  );
};

const PorteDuMois3D: React.FC<{ open: boolean; hover: boolean }> = ({ open, hover }) => (
  <Canvas
    className="!absolute inset-0"
    camera={{ position: [0.55, 0.14, 2.15], fov: 36 }}
    dpr={[1, 2]}
    gl={{ antialias: true, alpha: true }}
  >
    <ambientLight intensity={0.42} color="#f4e6c8" />
    <directionalLight position={[2.4, 2.2, 2.6]} intensity={1.15} color="#ffe0a6" />
    <directionalLight position={[-2.6, 0.6, 1.2]} intensity={0.35} color="#c7842c" />
    <pointLight position={[-0.4, -0.6, 1.6]} intensity={0.35} color="#b06a3f" />
    <Suspense fallback={null}>
      <Door open={open} hover={hover} />
      <ContactShadows position={[0, -0.98, 0]} opacity={0.5} scale={3.4} blur={2.6} far={1.4} color="#2a1a10" />
    </Suspense>
  </Canvas>
);

useGLTF.preload(MODEL, '/draco/');

export default PorteDuMois3D;
