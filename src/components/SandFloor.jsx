import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * SandFloor - Procedurally generated realistic sandbed
 * Features:
 * - Geometric displacement for dunes/mounds (not flat)
 * - Vertex color variation (darker in valleys)
 * - High resolution mesh for detailed lighting shadows
 */
const SandFloor = () => {
  const meshRef = useRef();
  
  // Dimensions
  const width = TANK_WIDTH - 0.5;
  const depth = TANK_DEPTH - 0.5;
  const segments = 128; // High res for smooth dunes

  // 1. Generate Procedural Sand Texture (Noise)
  const sandTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; // Higher resolution
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Base Sand Gradient - Natural aquarium sand (tan/beige)
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, '#e8d4b8'); // Warm tan
    gradient.addColorStop(0.5, '#d9c4a5'); // Natural beige
    gradient.addColorStop(1, '#c9b896'); // Deeper sand tone
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Heavy Noise Grain
    const imageData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const randomVal = Math.random();
      
      // Grain Brightness (High contrast)
      const grain = (Math.random() - 0.5) * 40; 
      
      // Color Variation:
      // 5% - Dark specks (Obsidian/Dirt)
      // 10% - White specks (Quartz)
      // 85% - Regular Sand
      
      let r = data[i] + grain;
      let g = data[i+1] + grain;
      let b = data[i+2] + grain;

      if (randomVal > 0.95) {
        // Dark Speck
        r *= 0.6; g *= 0.6; b *= 0.6; 
      } else if (randomVal < 0.1) {
        // White Speck (Quartz sparkle)
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
    texture.repeat.set(4, 4); // Repeat less for more detailed texture per unit
    // texture.anisotropy = 16; // Enable if available, but let's stick to basics
    
    return texture;
  }, []);

  // 2. Custom Geometry with noise displacement
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
    
    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();
    const colors = []; 

    const noise = (x, z) => {
      let y = 0;
      // Large dunes - INCREASED HEIGHT (1.2 units)
      y += Math.abs(Math.sin(x * 0.12) * Math.cos(z * 0.08)) * 1.2; 
      
      // Secondary asymmetrical drift (wind blown look)
      y += Math.sin(x * 0.3 + z * 0.1) * 0.4;

      // Small ripples
      y += Math.sin(x * 2.0) * 0.1;
      
      // Ensure strictly positive height with a base
      y = Math.max(0, y + 0.2);

      // Flatten edges
      const border = 3.0; 
      if (Math.abs(x) > width/2 - border || Math.abs(z) > depth/2 - border) {
         const xDist = (width/2) - Math.abs(x);
         const zDist = (depth/2) - Math.abs(z);
         const dist = Math.min(xDist, zDist);
         
         if (dist < border) {
            const t = dist / border;
            y *= t * t * (3.0 - 2.0 * t);
         }
      }
      return y;
    };

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      const height = noise(vertex.x, vertex.y);
      vertex.z = height; 
      posAttribute.setZ(i, height);

      // White vertex colors (relying on texture)
      colors.push(1.0, 1.0, 1.0);
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geo;
  }, [width, depth]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: sandTexture,
      bumpMap: sandTexture,
      bumpScale: 0.2,          // Stronger bump for texture depth
      vertexColors: true,
      roughness: 0.85,         // Matte sand look
      metalness: 0.05,         // Minimal reflection
      color: "#f0e6d3"         // Warm base tint
    });
  }, [sandTexture]);

  return (
    <mesh 
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow
    />
  );
};

export default SandFloor;
