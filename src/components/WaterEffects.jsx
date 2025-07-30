import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WaterEffects = () => {
  const waterSurfaceRef = useRef();
  const causticsRef = useRef();
  const particlesRef = useRef();
  const { size, clock } = useThree();
  
  // Create water surface shader material
  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        waterColor: { value: new THREE.Color(0x006994) },
        foamColor: { value: new THREE.Color(0x87CEEB) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;
        
        float wave(vec2 pos, float freq, float amp, float phase) {
          return sin(pos.x * freq + pos.y * freq * 0.7 + time * phase) * amp;
        }
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // Multiple wave frequencies for realistic water movement
          pos.z += wave(pos.xy, 0.5, 0.3, 2.0);
          pos.z += wave(pos.xy, 1.2, 0.15, 3.5);
          pos.z += wave(pos.xy, 2.8, 0.08, 1.8);
          pos.z += wave(pos.xy, 5.0, 0.04, 4.2);
          
          vPosition = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for(int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Animated water distortion
          vec2 distortion = vec2(
            sin(uv.y * 10.0 + time * 2.0) * 0.02,
            cos(uv.x * 12.0 + time * 1.5) * 0.015
          );
          
          uv += distortion;
          
          // Water color with depth variation
          float depth = smoothstep(0.0, 1.0, vPosition.z * 0.1 + 0.5);
          vec3 color = mix(waterColor * 0.6, waterColor, depth);
          
          // Add foam/bubbles
          float foam = fbm(uv * 8.0 + time * 0.5);
          foam = smoothstep(0.7, 1.0, foam);
          color = mix(color, foamColor, foam * 0.3);
          
          // Add caustics-like effect
          float caustics = sin(uv.x * 20.0 + time) * sin(uv.y * 15.0 + time * 1.3);
          caustics = pow(max(caustics, 0.0), 3.0);
          color += caustics * 0.4;
          
          gl_FragColor = vec4(color, 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [size]);

  // Create floating particles for underwater atmosphere
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    const velocities = new Float32Array(1000 * 3);
    
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.01 + 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    return geometry;
  }, []);

  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0x87CEEB,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
  }, []);

  useFrame(() => {
    const t = clock.elapsedTime;
    
    // Update water surface animation
    if (waterMaterial) {
      waterMaterial.uniforms.time.value = t;
    }
    
    // Animate floating particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      const velocities = particlesRef.current.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Reset particles that float too high
        if (positions[i + 1] > 25) {
          positions[i + 1] = -25;
          positions[i] = (Math.random() - 0.5) * 60;
          positions[i + 2] = (Math.random() - 0.5) * 50;
        }
        
        // Wrap particles horizontally
        if (Math.abs(positions[i]) > 35) {
          positions[i] = -Math.sign(positions[i]) * 35;
        }
        if (Math.abs(positions[i + 2]) > 30) {
          positions[i + 2] = -Math.sign(positions[i + 2]) * 30;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Water surface with animated waves */}
      <mesh
        ref={waterSurfaceRef}
        position={[0, 18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[100, 80, 64, 48]} />
        <primitive object={waterMaterial} />
      </mesh>
      
      {/* Floating particles for underwater atmosphere */}
      <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />
      
      {/* Volumetric light rays */}
      <mesh position={[0, 15, 0]} rotation={[-Math.PI / 6, 0, 0]}>
        <planeGeometry args={[80, 50, 1, 1]} />
        <meshBasicMaterial
          color={0x4fc3f7}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      <mesh position={[15, 12, -10]} rotation={[-Math.PI / 4, Math.PI / 8, 0]}>
        <planeGeometry args={[60, 40, 1, 1]} />
        <meshBasicMaterial
          color={0x87CEEB}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export default WaterEffects; 