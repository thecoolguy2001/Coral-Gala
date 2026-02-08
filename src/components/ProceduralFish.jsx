import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ProceduralFish = ({ color, size = 1, speed = 1, species = 'Clownfish' }) => {
  const meshRef = useRef();
  
  // Custom shader material for realistic swimming
  const fishMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(color) },
        swimSpeed: { value: Math.max(speed, 1.5) * 4.0 },
        wiggleAmplitude: { value: 0.25 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform float swimSpeed;
        uniform float wiggleAmplitude;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          vec3 pos = position;
          vPosition = pos;
          
          // REALISTIC FISH SWIMMING:
          // 1. Sine wave propagates from head to tail
          // 2. Head stays relatively stable (low amplitude)
          // 3. Tail has high amplitude
          // 4. Wave speed scales with swimSpeed
          
          // pos.z is roughly -0.5 to 0.5. Let's map it so 0.5 is head, -0.5 is tail.
          float bodyCoord = pos.z; // 0.5 (head) to -0.5 (tail)
          
          // Factor that is 0 at head and 1 at tail
          float tailFactor = smoothstep(0.4, -0.6, bodyCoord);
          
          // Wave phase - adds delay down the body
          float phase = bodyCoord * 5.0;
          float wiggle = sin(phase + time * swimSpeed) * wiggleAmplitude * tailFactor;
          
          // Apply horizontal wiggle (Y-axis rotation effect)
          pos.x += wiggle;
          
          // Secondary vertical wag (tail goes slightly up/down too)
          pos.y += cos(phase + time * swimSpeed * 0.8) * wiggleAmplitude * 0.2 * tailFactor;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 color;

        void main() {
          vec3 light = normalize(vec3(1.0, 1.0, 1.0));
          float dProd = max(0.2, dot(vNormal, light));
          
          // Add some shimmer based on normal (fish scales)
          float shimmer = pow(max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))), 2.0) * 0.2;
          
          // Patterning: Darker on top, lighter on bottom
          float verticalGradient = smoothstep(-0.3, 0.3, vPosition.y);
          vec3 bodyColor = mix(color * 0.5, color * 1.2, verticalGradient);
          
          // Species specific highlights (fake)
          float stripes = sin(vPosition.z * 15.0) * 0.1;
          bodyColor += stripes * 0.1;
          
          vec3 finalColor = bodyColor * dProd;
          finalColor += shimmer;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, [color, speed, species]);

  // Create fish geometry based on species
  const { bodyGeom, dorsalFinGeom, tailFinGeom, proportions } = useMemo(() => {
    let bodyScale = [0.3, 0.5, 1.0]; // x, y, z
    let dorsalSize = [0.5, 0.3];
    let tailSize = [0.6, 0.6];

    if (species === 'Angelfish') {
      bodyScale = [0.15, 0.9, 0.8]; // Flat and tall
      dorsalSize = [0.6, 0.6];
      tailSize = [0.5, 0.8];
    } else if (species === 'Blue Tang') {
      bodyScale = [0.25, 0.6, 0.9];
      dorsalSize = [0.7, 0.2];
      tailSize = [0.5, 0.5];
    } else if (species === 'Nemo Fish' || species === 'Clownfish') {
      bodyScale = [0.35, 0.45, 0.7];
      dorsalSize = [0.4, 0.25];
      tailSize = [0.4, 0.4];
    }

    const bGeom = new THREE.SphereGeometry(0.5, 32, 16);
    bGeom.scale(...bodyScale);
    
    const dGeom = new THREE.PlaneGeometry(...dorsalSize);
    const tGeom = new THREE.PlaneGeometry(...tailSize);
    
    return { 
      bodyGeom: bGeom, 
      dorsalFinGeom: dGeom, 
      tailFinGeom: tGeom,
      proportions: { bodyScale, tailPos: -bodyScale[2] * 0.5 }
    };
  }, [species]);

  useFrame((state) => {
    if (fishMaterial.uniforms) {
      fishMaterial.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group scale={size}>
      {/* Body */}
      <mesh geometry={bodyGeom} material={fishMaterial} castShadow receiveShadow />
      
      {/* Dorsal Fin */}
      <mesh 
        geometry={dorsalFinGeom} 
        material={fishMaterial} 
        position={[0, proportions.bodyScale[1] * 0.45, 0]} 
        rotation={[0, Math.PI / 2, 0]} 
      />

      {/* Tail Fin */}
      <mesh 
        geometry={tailFinGeom} 
        material={fishMaterial} 
        position={[0, 0, proportions.tailPos]} 
        rotation={[0, Math.PI / 2, 0]} 
      />

      {/* Pectoral Fins (Left & Right) */}
      <mesh 
        position={[proportions.bodyScale[0] * 0.45, -0.05, 0.1]} 
        rotation={[0.2, 0, 0.5]}
      >
        <planeGeometry args={[0.2, 0.15]} />
        <primitive object={fishMaterial} attach="material" />
      </mesh>
      <mesh 
        position={[-proportions.bodyScale[0] * 0.45, -0.05, 0.1]} 
        rotation={[0.2, 0, -0.5]}
      >
        <planeGeometry args={[0.2, 0.15]} />
        <primitive object={fishMaterial} attach="material" />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[proportions.bodyScale[0] * 0.35, proportions.bodyScale[1] * 0.2, proportions.bodyScale[2] * 0.4]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#050505" roughness={0.1} />
      </mesh>
      <mesh position={[-proportions.bodyScale[0] * 0.35, proportions.bodyScale[1] * 0.2, proportions.bodyScale[2] * 0.4]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#050505" roughness={0.1} />
      </mesh>
    </group>
  );
};

export default ProceduralFish;
