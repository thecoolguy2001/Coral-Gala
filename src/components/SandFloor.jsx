import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * SandFloor - Thick sand bed built as a single extruded mesh.
 * The top surface has dune displacement, the sides and bottom are flat.
 * Looks like a real layer of sand poured into the tank.
 */
const SandFloor = () => {
  const meshRef = useRef();

  const width = TANK_WIDTH - 0.6;
  const depth = TANK_DEPTH - 0.6;
  const sandThickness = 1.5;
  const segX = 128;
  const segZ = 128;

  // Procedural Sand Texture
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
      let g = data[i + 1] + grain;
      let b = data[i + 2] + grain;

      if (randomVal > 0.95) {
        r *= 0.6; g *= 0.6; b *= 0.6;
      } else if (randomVal < 0.1) {
        r += 50; g += 50; b += 50;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    return texture;
  }, []);

  // Build a single solid sand geometry: flat bottom/sides, displaced top
  const sandGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(width, sandThickness, depth, segX, 1, segZ);
    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();

    const noise = (x, z) => {
      let y = 0;
      // Large dunes
      y += Math.abs(Math.sin(x * 0.12) * Math.cos(z * 0.08)) * 1.0;
      // Secondary asymmetrical drift
      y += Math.sin(x * 0.3 + z * 0.1) * 0.3;
      // Small ripples
      y += Math.sin(x * 2.0) * 0.08;
      y = Math.max(0, y + 0.15);
      return y;
    };

    // Only displace vertices on the top face (y > 0)
    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      if (vertex.y > 0) {
        // This vertex is on the top face - apply dune displacement
        const duneHeight = noise(vertex.x, vertex.z);
        posAttribute.setY(i, vertex.y + duneHeight);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }, [width, depth, sandThickness]);

  const sandMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: sandTexture,
      bumpMap: sandTexture,
      bumpScale: 0.15,
      roughness: 0.8,
      metalness: 0.1,
      color: '#ffffff',
    });
  }, [sandTexture]);

  return (
    <mesh
      ref={meshRef}
      geometry={sandGeometry}
      material={sandMaterial}
      position={[0, sandThickness / 2, 0]}
      receiveShadow
    />
  );
};

export default SandFloor;
