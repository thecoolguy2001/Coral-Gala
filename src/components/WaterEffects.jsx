import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WaterEffects = () => {
  const causticsRef = useRef();
  const bubblesRef = useRef();
  const { size, clock, viewport } = useThree();
  
  // Water ripple refraction shader for background distortion
  const rippleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        distortionStrength: { value: 0.02 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        uniform float distortionStrength;
        varying vec2 vUv;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        
        float smoothNoise(vec2 p) {
          vec2 inter = smoothstep(0., 1., fract(p));
          float s = mix(noise(floor(p)), noise(floor(p) + vec2(1., 0.)), inter.x);
          float n = mix(noise(floor(p) + vec2(0., 1.)), noise(floor(p) + vec2(1., 1.)), inter.x);
          return mix(s, n, inter.y);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for(int i = 0; i < 6; i++) {
            value += amplitude * smoothNoise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Create multiple wave distortions
          float wave1 = sin(uv.x * 15.0 + time * 2.0) * sin(uv.y * 10.0 + time * 1.5);
          float wave2 = sin(uv.x * 8.0 + time * -1.2) * sin(uv.y * 12.0 + time * 0.8);
          float wave3 = fbm(uv * 4.0 + time * 0.3);
          
          // Combine waves for complex water movement
          vec2 distortion = vec2(
            (wave1 + wave2 * 0.5 + wave3 * 0.3) * distortionStrength,
            (wave2 + wave1 * 0.5 + wave3 * 0.4) * distortionStrength
          );
          
          uv += distortion;
          
          // Background color with depth variation
          vec3 deepWater = vec3(0.1, 0.2, 0.4);
          vec3 shallowWater = vec3(0.2, 0.4, 0.6);
          vec3 color = mix(deepWater, shallowWater, wave3);
          
          // Add subtle foam where distortion is high
          float foam = smoothstep(0.8, 1.0, abs(wave1 + wave2));
          color = mix(color, vec3(0.7, 0.9, 1.0), foam * 0.3);
          
          gl_FragColor = vec4(color, 0.6);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [size]);

  // Water caustics shader for light shimmer
  const causticsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(size.width, size.height) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;
        
        float caustic(vec2 uv, float time) {
          vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
          vec2 i = vec2(p);
          float c = 1.0;
          float inten = 0.005;
          
          for (int n = 0; n < 5; n++) {
            float t = time * (1.0 - (3.5 / float(n+1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));
          }
          c /= float(5);
          c = 1.17-pow(c, 1.4);
          return pow(abs(c), 8.0);
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Create multiple caustic layers
          float c1 = caustic(uv, time);
          float c2 = caustic(uv * 0.8, time * 0.7);
          float c3 = caustic(uv * 1.3, time * 1.2);
          
          float caustics = (c1 + c2 * 0.6 + c3 * 0.4);
          
          // Color the caustics with underwater tones
          vec3 color = vec3(0.4, 0.8, 1.0) * caustics;
          color += vec3(1.0, 0.9, 0.6) * caustics * 0.5;
          
          gl_FragColor = vec4(color, caustics * 0.7);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }, [size]);

  // Bubble particles geometry
  const bubblesData = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(200 * 3);
    const scales = new Float32Array(200);
    const velocities = new Float32Array(200 * 3);

    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40 - 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      scales[i] = Math.random() * 0.5 + 0.1;

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = Math.random() * 0.02 + 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    return geometry;
  }, []);

  const bubbleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: { value: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==') }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        uniform float time;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          
          // Add wobble to bubble movement
          pos.x += sin(time * 2.0 + position.y * 0.1) * 0.3;
          pos.z += cos(time * 1.5 + position.x * 0.1) * 0.2;
          
          vAlpha = 1.0 - (pos.y + 20.0) / 40.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = scale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vAlpha;
        
        void main() {
          gl_FragColor = vec4(0.8, 0.9, 1.0, vAlpha * 0.4);
          
          // Make bubbles circular
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor.a *= alpha * vAlpha;
        }
      `,
      transparent: true,
      vertexColors: false,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useFrame(() => {
    const t = clock.elapsedTime;
    
    // Update ripple animation
    if (rippleMaterial) {
      rippleMaterial.uniforms.time.value = t;
    }
    
    // Update caustics animation
    if (causticsMaterial) {
      causticsMaterial.uniforms.time.value = t;
    }
    
    // Update bubble material
    if (bubbleMaterial) {
      bubbleMaterial.uniforms.time.value = t;
    }
    
    // Animate bubble positions
    if (bubblesRef.current) {
      const positions = bubblesRef.current.geometry.attributes.position.array;
      const velocities = bubblesRef.current.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Reset bubbles that reach the top
        if (positions[i + 1] > 25) {
          positions[i + 1] = -25;
          positions[i] = (Math.random() - 0.5) * 60;
          positions[i + 2] = (Math.random() - 0.5) * 50;
        }
      }
      
      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Water caustics overlay */}
      <mesh
        ref={causticsRef}
        position={[0, 0, 10]}
        scale={[viewport.width * 2, viewport.height * 2, 1]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <primitive object={causticsMaterial} />
      </mesh>

      {/* Bubble particles */}
      <points ref={bubblesRef} geometry={bubblesData} material={bubbleMaterial} />
    </group>
  );
};

export default WaterEffects; 