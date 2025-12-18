import React from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, FRAME_THICKNESS } from '../constants/tankDimensions';

/**
 * Environment - Creates a realistic room environment for the aquarium
 * Includes table surface and wall background
 */
const Environment = ({ roomLightsOn }) => {
  // Table dimensions - Expansive wood surface
  const tableWidth = 200; // Much wider
  const tableDepth = 150; // Much deeper
  const tableHeight = 2;
  const tableYPosition = -TANK_HEIGHT / 2 - FRAME_THICKNESS - tableHeight / 2 - 0.5;

  // Wall dimensions
  const wallWidth = 500; 
  const wallHeight = 200; 
  const wallYPosition = 20;
  const wallZPosition = -TANK_DEPTH / 2 - 40; 

  // Floor dimensions
  const floorWidth = 500;
  const floorDepth = 400;
  const floorYPosition = tableYPosition - tableHeight / 2 - 0.1;

  // Colors based on light state
  const wallColor = roomLightsOn ? "#d4cfc0" : "#111111";
  const floorColor = roomLightsOn ? "#2a1e1a" : "#0d0d0d"; // Dark wood brown vs pitch black
  const baseboardColor = roomLightsOn ? "#f5f5f0" : "#222222";
  const legsColor = roomLightsOn ? "#6b5944" : "#151515";

  return (
    <group>
      {/* WALL - Behind the tank */}
      <mesh position={[0, wallYPosition, wallZPosition]} receiveShadow>
        <planeGeometry args={[wallWidth, wallHeight]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* TABLE SURFACE - Under the tank (Always Wood) */}
      <mesh position={[0, tableYPosition, 0]} receiveShadow>
        <boxGeometry args={[tableWidth, tableHeight, tableDepth]} />
        <meshStandardMaterial
          color="#4a3728" // Dark Mahogany Wood
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* TABLE LEGS - Four corners */}
      {[
        [-tableWidth / 2 + 3, tableYPosition - tableHeight / 2 - 15, -tableDepth / 2 + 3],
        [tableWidth / 2 - 3, tableYPosition - tableHeight / 2 - 15, -tableDepth / 2 + 3],
        [-tableWidth / 2 + 3, tableYPosition - tableHeight / 2 - 15, tableDepth / 2 - 3],
        [tableWidth / 2 - 3, tableYPosition - tableHeight / 2 - 15, tableDepth / 2 - 3],
      ].map((pos, i) => (
        <mesh key={`leg-${i}`} position={pos}>
          <cylinderGeometry args={[1, 1, 30, 8]} />
          <meshStandardMaterial
            color={legsColor}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* FLOOR - Wooden floor boards pattern */}
      <mesh
        position={[0, floorYPosition, 5]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* BASEBOARD - Where wall meets floor */}
      <mesh position={[0, wallYPosition - wallHeight / 2 + 2, wallZPosition + 0.5]}>
        <boxGeometry args={[wallWidth, 4, 1]} />
        <meshStandardMaterial
          color={baseboardColor}
          roughness={0.7}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
};

export default Environment;
