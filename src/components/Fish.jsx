import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Fish = ({ boid, onFishClick }) => {
  const mesh = useRef();
  const tailRef = useRef();
  const finRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [swimPhase, setSwimPhase] = useState(0);

  useFrame((state, delta) => {
    if (!mesh.current || !boid || !boid.position || !boid.ref) return;

    // Apply the position and rotation calculated by the simulation
    mesh.current.position.copy(boid.position);
    mesh.current.quaternion.copy(boid.ref.quaternion);
    // Remove extra undulation to prevent spinning
    // mesh.current.rotation.z = Math.sin(swimPhase * 1.5) * 0.1;

    // Add hover effect
    mesh.current.scale.setScalar(isHovered ? 1.2 : 1.0);

    // Swimming animation
    const swimSpeed = boid.velocity.length() * 2;
    setSwimPhase(prev => prev + swimSpeed * delta);

    // Update Fresnel material time
    if (fresnelMaterial) {
      fresnelMaterial.uniforms.time.value = state.clock.elapsedTime;
    }

    // Tail wagging animation
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(swimPhase * 3) * 0.3;
    }

    // Fin flapping animation
    if (finRef.current) {
      finRef.current.rotation.z = Math.sin(swimPhase * 2) * 0.2;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onFishClick) {
      onFishClick(boid);
    }
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    document.body.style.cursor = 'default';
  };

  // Get fish color from boid data
  const fishColor = boid.color || '#FF6B35';
  const fishSize = boid.size || 1.0;

  // Create Fresnel material for glass-tank effect
  const fresnelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(fishColor) },
        time: { value: 0 },
        fresnelBias: { value: 0.1 },
        fresnelScale: { value: 1.0 },
        fresnelPower: { value: 2.0 }
      },
      vertexShader: `
        uniform float time;
        varying vec3 vReflect;
        varying vec3 vRefract[3];
        varying float vReflectionFactor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          
          vec3 worldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);
          
          vec3 I = worldPosition.xyz - cameraPosition;
          
          vReflect = reflect(I, worldNormal);
          
          float ratio = 1.00 / 1.33; // Air to water IOR
          vRefract[0] = refract(normalize(I), worldNormal, ratio);
          vRefract[1] = refract(normalize(I), worldNormal, ratio * 0.99);
          vRefract[2] = refract(normalize(I), worldNormal, ratio * 0.98);
          
          vNormal = normalize(normalMatrix * normal);
          vViewPosition = -mvPosition.xyz;
          vReflectionFactor = 0.1 + 1.0 * pow(1.0 + dot(normalize(I), worldNormal), 2.0);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float fresnelBias;
        uniform float fresnelScale;
        uniform float fresnelPower;
        
        varying vec3 vReflect;
        varying vec3 vRefract[3];
        varying float vReflectionFactor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec4 reflectedColor = vec4(0.4, 0.6, 1.0, 1.0);
          vec4 refractedColor = vec4(color, 1.0);
          
          // Add some underwater shimmer
          float shimmer = sin(time * 4.0 + vViewPosition.x * 10.0) * 0.1 + 0.9;
          refractedColor.rgb *= shimmer;
          
          // Fresnel calculation
          float fresnel = fresnelBias + fresnelScale * pow(1.0 + dot(normalize(vViewPosition), vNormal), fresnelPower);
          
          vec4 finalColor = mix(refractedColor, reflectedColor, fresnel);
          finalColor.rgb += vec3(0.1, 0.2, 0.3) * (1.0 - fresnel) * 0.5; // Underwater tint
          
          gl_FragColor = finalColor;
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [fishColor]);

  return (
    <group>
      {/* Main fish body */}
      <mesh 
        ref={mesh} 
        rotation={[0, 0, Math.PI / 2]}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        scale={[fishSize, fishSize, fishSize]}
      >
        {/* Fish body */}
        <cylinderGeometry args={[0.2, 0.3, 1.2, 8]} />
        <primitive object={fresnelMaterial} />
      </mesh>
      {/* Fish tail */}
      <mesh 
        ref={tailRef}
        position={[0, -0.6, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <coneGeometry args={[0.1, 0.4, 4]} />
        <meshStandardMaterial 
          color={fishColor} 
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      {/* Fish fins */}
      <mesh 
        ref={finRef}
        position={[0, 0.2, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <coneGeometry args={[0.05, 0.2, 4]} />
        <meshStandardMaterial 
          color={fishColor} 
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      {/* Fish eye */}
      <mesh 
        position={[0.15, 0.1, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial 
          color="#000000" 
          roughness={0.1}
        />
      </mesh>
      {/* Fish eye highlight */}
      <mesh 
        position={[0.18, 0.12, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};

export default Fish; 