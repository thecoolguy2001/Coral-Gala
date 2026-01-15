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
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base Fill
    ctx.fillStyle = '#fdf8e5';
    ctx.fillRect(0, 0, 512, 512);

    // Noise Grain
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Random grain variation
      const grain = (Math.random() - 0.5) * 30; // +/- 15 brightness
      
      // Add scattered "black sand" particles (obsidian/volcanic bits)
      const blackSpeck = Math.random() > 0.99 ? -100 : 0;
      
      data[i] = Math.max(0, Math.min(255, data[i] + grain + blackSpeck));     // R
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + grain + blackSpeck)); // G
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + grain + blackSpeck)); // B
      // Alpha stays 255
    }
    
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 4); // Repeat for detail
    
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
      // Large dunes - Reduced amplitude to avoid deep dark valleys
      y += Math.sin(x * 0.15) * Math.cos(z * 0.1) * 0.6; 
      // Medium ripples
      y += Math.sin(x * 0.5 + z * 0.2) * 0.2;
      // Small irregularities
      y += Math.cos(x * 1.5 - z * 1.2) * 0.05;
      
      // Flatten edges
      const border = 3.0; // Wider border for smoother transition
      if (Math.abs(x) > width/2 - border || Math.abs(z) > depth/2 - border) {
         // Smooth falloff using smoothstep
         const xDist = (width/2) - Math.abs(x);
         const zDist = (depth/2) - Math.abs(z);
         const dist = Math.min(xDist, zDist);
         
         if (dist < border) {
            // smoothstep returns 0.0 to 1.0
            const t = dist / border;
            // distinct smoothstep: 3t^2 - 2t^3
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

      // Vertex Color - Set to white to remove forced shading
      // The texture and real lighting will handle the look
      colors.push(1.0, 1.0, 1.0);
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geo;
  }, [width, depth]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: sandTexture,        // Diffuse Texture
      bumpMap: sandTexture,    // Bump for 3D grain
      bumpScale: 0.05,         // Subtle bump
      vertexColors: true,      // Keep subtle AO
      roughness: 1.0,          // Sand is very rough (matte)
      metalness: 0.0,
      color: "#ffffff"         // White to let texture show true
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
