import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_DEPTH, TANK_HEIGHT } from '../constants/tankDimensions';

/**
 * SandFloor - Thick sand bed with displaced surface on top
 * The sand fills the bottom of the tank as a solid layer,
 * with dunes and ripples on the surface.
 */
const SandFloor = () => {
  const meshRef = useRef();

  // Dimensions - fill the tank floor wall to wall
  const width = TANK_WIDTH - 0.6;
  const depth = TANK_DEPTH - 0.6;
  const sandThickness = 1.2; // Solid base layer of sand
  const segments = 128;

  // Generate Procedural Sand Texture
  const sandTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, '#fdfcf0');
    gradient.addColorStop(1, '#f5e6cc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    const imageData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const randomVal = Math.random();
      const grain = (Math.random() - 0.5) * 40;

      let r = data[i] + grain;
      let g = data[i+1] + grain;
      let b = data[i+2] + grain;

      if (randomVal > 0.95) {
        r *= 0.6; g *= 0.6; b *= 0.6;
      } else if (randomVal < 0.1) {
        r += 50; g += 50; b += 50;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i+1] = Math.max(0, Math.min(255, g));
      data[i+2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    return texture;
  }, []);

  // Sand surface geometry with dune displacement
  const surfaceGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);

    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();

    const noise = (x, z) => {
      let y = 0;
      // Large dunes
      y += Math.abs(Math.sin(x * 0.12) * Math.cos(z * 0.08)) * 1.2;
      // Secondary asymmetrical drift (wind blown look)
      y += Math.sin(x * 0.3 + z * 0.1) * 0.4;
      // Small ripples
      y += Math.sin(x * 2.0) * 0.1;
      // Start at 0 so surface sits flush on the sand body
      y = Math.max(0, y + 0.2);
      return y;
    };

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      const height = noise(vertex.x, vertex.y);
      posAttribute.setZ(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, [width, depth]);

  const sandMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: sandTexture,
      bumpMap: sandTexture,
      bumpScale: 0.15,
      roughness: 0.8,
      metalness: 0.1,
      color: "#ffffff"
    });
  }, [sandTexture]);

  return (
    <group>
      {/* Solid sand body - thick box filling the bottom of the tank */}
      <mesh position={[0, sandThickness / 2, 0]} receiveShadow>
        <boxGeometry args={[width, sandThickness, depth]} />
        <meshStandardMaterial
          map={sandTexture}
          bumpMap={sandTexture}
          bumpScale={0.1}
          roughness={0.85}
          metalness={0.05}
          color="#f0e0c8"
        />
      </mesh>

      {/* Sand surface with dunes on top of the solid body */}
      <mesh
        ref={meshRef}
        geometry={surfaceGeometry}
        material={sandMaterial}
        position={[0, sandThickness - 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />
    </group>
  );
};

export default SandFloor;
