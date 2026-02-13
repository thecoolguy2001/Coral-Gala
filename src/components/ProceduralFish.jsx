import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ProceduralFish - A fully procedural fish that bends and swims realistically
 * No external models - geometry is created programmatically with proper deformation
 */
const ProceduralFish = ({ boid, onFishClick }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const tailFinRef = useRef();
  const dorsalFinRef = useRef();
  const leftPectoralRef = useRef();
  const rightPectoralRef = useRef();

  // Store original vertices for deformation
  const originalPositions = useRef(null);

  // Individual fish properties for animation variation
  const fishProps = useMemo(() => {
    const phase = boid.randoms?.phaseOffset || Math.random() * Math.PI * 2;
    return {
      phase,
      swimSpeed: 0.8 + Math.random() * 0.4,
      bendAmount: 0.15 + Math.random() * 0.1,
      tailSpeed: 1.0 + Math.random() * 0.3,
      bodyLength: 1.8 + Math.random() * 0.4,
      bodyHeight: 0.5 + Math.random() * 0.15,
      color: new THREE.Color(boid.color || '#FF6B35'),
      // Subtle color variations
      bellyColor: new THREE.Color(boid.color || '#FF6B35').lerp(new THREE.Color('#FFFFFF'), 0.6),
    };
  }, [boid.color, boid.randoms?.phaseOffset]);

  // Create fish body geometry - tapered ellipsoid with segments for bending
  const bodyGeometry = useMemo(() => {
    const { bodyLength, bodyHeight } = fishProps;
    const segments = 24; // More segments = smoother bending
    const radialSegments = 16;

    // Create a custom geometry based on a tapered cylinder/ellipsoid
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    // Generate fish body shape
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 = head, 1 = tail
      const z = (t - 0.5) * bodyLength; // Position along body

      // Fish body profile - wider in front, tapers to tail
      // Using a custom curve for fish shape
      let radius;
      if (t < 0.3) {
        // Head section - rounded
        radius = bodyHeight * 0.6 * Math.sin(t / 0.3 * Math.PI * 0.5);
      } else if (t < 0.6) {
        // Body section - full width
        radius = bodyHeight * 0.6;
      } else {
        // Tail section - tapers
        const tailT = (t - 0.6) / 0.4;
        radius = bodyHeight * 0.6 * (1 - tailT * 0.85);
      }

      // Vertical scaling - fish are taller than wide
      const verticalScale = 1.3;

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;

        // Elliptical cross-section
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius * verticalScale;

        vertices.push(x, y, z);

        // Normal
        const nx = Math.cos(theta);
        const ny = Math.sin(theta) * verticalScale;
        const len = Math.sqrt(nx * nx + ny * ny);
        normals.push(nx / len, ny / len, 0);

        // UV
        uvs.push(j / radialSegments, t);

        // Vertex colors - darker on top, lighter belly
        const topFactor = Math.max(0, Math.sin(theta)); // 1 at top, 0 at sides, -1 at bottom
        const colorMix = (1 - topFactor) * 0.5 + 0.5; // 0.5-1.0 range
        const vertColor = fishProps.color.clone().lerp(fishProps.bellyColor, 1 - colorMix);
        colors.push(vertColor.r, vertColor.g, vertColor.b);
      }
    }

    // Generate indices
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    return geometry;
  }, [fishProps]);

  // Create tail fin geometry
  const tailFinGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Forked tail shape
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3, 0.4, 0.1, 0.7);
    shape.lineTo(0, 0.5);
    shape.lineTo(-0.1, 0.7);
    shape.quadraticCurveTo(-0.3, 0.4, 0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);
    geometry.rotateY(Math.PI / 2);
    geometry.scale(0.8, 0.8, 0.8);
    return geometry;
  }, []);

  // Create dorsal fin geometry
  const dorsalFinGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.2, 0.25, 0.5, 0.15);
    shape.lineTo(0.6, 0);
    shape.lineTo(0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(1.2, 1, 0.8);
    return geometry;
  }, []);

  // Create pectoral fin geometry
  const pectoralFinGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.15, 0.1, 0.3, 0.05);
    shape.quadraticCurveTo(0.2, -0.05, 0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.scale(0.6, 0.6, 0.6);
    return geometry;
  }, []);

  // Fish material with iridescence
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
  }, []);

  const finMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: fishProps.color.clone().multiplyScalar(0.8),
      transparent: true,
      opacity: 0.85,
      metalness: 0.1,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
  }, [fishProps.color]);

  // Store original positions on first render
  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;

    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;

    // Store original positions if not done yet
    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(positions.array);
    }

    const time = state.clock.elapsedTime;
    const { phase, swimSpeed, bendAmount, tailSpeed, bodyLength } = fishProps;

    // Get current swimming speed from boid velocity
    const speed = boid.velocity ? boid.velocity.length() : 0.1;
    const speedFactor = Math.min(speed * 3, 1.5); // Scale animation with movement speed

    // Apply body bending - S-curve wave from head to tail
    const original = originalPositions.current;
    const pos = positions.array;

    for (let i = 0; i < positions.count; i++) {
      const ox = original[i * 3];
      const oy = original[i * 3 + 1];
      const oz = original[i * 3 + 2];

      // Z position determines how much this vertex bends (tail bends more)
      const zNorm = (oz / bodyLength + 0.5); // 0 at head, 1 at tail
      const bendFactor = Math.pow(zNorm, 1.5); // Exponential - tail bends much more

      // S-curve wave traveling from head to tail
      const wave = Math.sin(
        (time * swimSpeed * tailSpeed + phase) * 4 - zNorm * Math.PI * 2
      );

      // Bend amount increases with speed
      const actualBend = bendAmount * speedFactor * bendFactor;

      // Apply lateral (X) displacement
      pos[i * 3] = ox + wave * actualBend;

      // Slight vertical wave for more realism
      pos[i * 3 + 1] = oy + wave * actualBend * 0.2 * bendFactor;

      // Z stays the same
      pos[i * 3 + 2] = oz;
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    // Animate tail fin - follows body wave with extra amplitude
    if (tailFinRef.current) {
      const tailWave = Math.sin((time * swimSpeed * tailSpeed + phase) * 4);
      tailFinRef.current.rotation.y = tailWave * 0.5 * speedFactor;
    }

    // Animate dorsal fin - gentle wave
    if (dorsalFinRef.current) {
      const dorsalWave = Math.sin((time * swimSpeed + phase) * 2);
      dorsalFinRef.current.rotation.z = dorsalWave * 0.1 * speedFactor;
    }

    // Animate pectoral fins - rowing motion
    if (leftPectoralRef.current && rightPectoralRef.current) {
      const pectoralWave = Math.sin((time * swimSpeed * 1.5 + phase) * 3);
      const baseAngle = -Math.PI / 4;
      leftPectoralRef.current.rotation.z = baseAngle + pectoralWave * 0.3 * speedFactor;
      rightPectoralRef.current.rotation.z = -(baseAngle + pectoralWave * 0.3 * speedFactor);

      // Forward/back sweep
      leftPectoralRef.current.rotation.y = pectoralWave * 0.2 * speedFactor;
      rightPectoralRef.current.rotation.y = -pectoralWave * 0.2 * speedFactor;
    }

    // Update group position and rotation from boid
    if (boid.position) {
      groupRef.current.position.lerp(boid.position, 0.3);
    }
    if (boid.ref?.quaternion) {
      groupRef.current.quaternion.slerp(boid.ref.quaternion, 0.15);
    }

    // Apply banking
    if (boid.bankAngle) {
      const bankQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        boid.bankAngle * 0.5
      );
      groupRef.current.quaternion.multiply(bankQuat);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onFishClick) {
      onFishClick(boid);
    }
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerEnter={() => {
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
      scale={isHovered ? 1.15 : 1.0}
    >
      {/* Main body */}
      <mesh
        ref={meshRef}
        geometry={bodyGeometry}
        material={bodyMaterial}
        castShadow
        receiveShadow
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Tail fin */}
      <mesh
        ref={tailFinRef}
        geometry={tailFinGeometry}
        material={finMaterial}
        position={[0, 0, fishProps.bodyLength * 0.45]}
        rotation={[0, 0, 0]}
        castShadow
      />

      {/* Dorsal fin */}
      <mesh
        ref={dorsalFinRef}
        geometry={dorsalFinGeometry}
        material={finMaterial}
        position={[0, fishProps.bodyHeight * 0.6, -fishProps.bodyLength * 0.1]}
        castShadow
      />

      {/* Left pectoral fin */}
      <mesh
        ref={leftPectoralRef}
        geometry={pectoralFinGeometry}
        material={finMaterial}
        position={[fishProps.bodyHeight * 0.4, -fishProps.bodyHeight * 0.1, -fishProps.bodyLength * 0.2]}
        rotation={[0, Math.PI / 6, -Math.PI / 4]}
        castShadow
      />

      {/* Right pectoral fin */}
      <mesh
        ref={rightPectoralRef}
        geometry={pectoralFinGeometry}
        material={finMaterial}
        position={[-fishProps.bodyHeight * 0.4, -fishProps.bodyHeight * 0.1, -fishProps.bodyLength * 0.2]}
        rotation={[0, -Math.PI / 6, Math.PI / 4]}
        castShadow
      />

      {/* Eye - right */}
      <mesh position={[fishProps.bodyHeight * 0.35, fishProps.bodyHeight * 0.2, -fishProps.bodyLength * 0.35]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Eye - left */}
      <mesh position={[-fishProps.bodyHeight * 0.35, fishProps.bodyHeight * 0.2, -fishProps.bodyLength * 0.35]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

export default ProceduralFish;
