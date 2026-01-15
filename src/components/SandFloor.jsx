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

  // Custom Geometry with noise displacement
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
    
    // Displace vertices
    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();
    const colors = []; // For vertex coloring

    // Simple pseudo-random noise function
    // (We don't have a noise library, so we stack sin/cos waves)
    const noise = (x, z) => {
      let y = 0;
      // Large dunes
      y += Math.sin(x * 0.15) * Math.cos(z * 0.1) * 0.8;
      // Medium ripples
      y += Math.sin(x * 0.5 + z * 0.2) * 0.3;
      // Small irregularities
      y += Math.cos(x * 1.5 - z * 1.2) * 0.1;
      // Tiny texture
      y += Math.sin(x * 5.0) * Math.cos(z * 4.0) * 0.05;
      
      // Flatten edges to prevent leaking through glass
      const edgeDist = Math.min(
        Math.abs(x - width/2), 
        Math.abs(x + width/2),
        Math.abs(z - depth/2),
        Math.abs(z + depth/2)
      );
      // Smoothly blend to 0 at edges
      /*
        If we are within 2 units of edge, dampen the height.
        This ensures the sand meets the glass cleanly.
      */
      const border = 1.0;
      if (Math.abs(x) > width/2 - border || Math.abs(z) > depth/2 - border) {
         y *= 0.2; // Flatten near walls
      }

      return y;
    };

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      
      // Calculate height
      // Plane is initialized in XY plane, but we rotate it -90 X later.
      // So here 'z' is actually 'y' in local space before rotation? 
      // Wait, PlaneGeometry is on XY. We usually map height to Z.
      // Then we render it with rotation=[-PI/2, 0, 0].
      // So variations in Z (local) become variations in Y (world).
      
      const height = noise(vertex.x, vertex.y); // Vertex.y corresponds to world Z depth before rotation
      vertex.z = height; 

      posAttribute.setZ(i, height);

      // Vertex Color Calculation
      // Light sand on peaks, slightly darker/wetter in valleys
      const baseColor = new THREE.Color("#fdf8e5"); // Sand
      const shadowColor = new THREE.Color("#e6dcc0"); // Darker wet sand
      
      // Mix based on height
      const mixFactor = (height + 1.0) * 0.5; // Approximate range
      const finalColor = shadowColor.clone().lerp(baseColor, THREE.MathUtils.clamp(mixFactor + 0.2, 0, 1));
      
      colors.push(finalColor.r, finalColor.g, finalColor.b);
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geo;
  }, [width, depth]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true, // Enable the custom shadowing
      roughness: 0.9,     // Sand is rough
      metalness: 0.0,
      flatShading: false,
    });
  }, []);

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
