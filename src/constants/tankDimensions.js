/**
 * Tank Dimensions - Shared across all components
 * These represent the physical aquarium tank size (Fish Center Live style)
 */

// Tank outer dimensions
export const TANK_WIDTH = 40;
export const TANK_HEIGHT = 25;
export const TANK_DEPTH = 20;

// Tank structure dimensions
export const GLASS_THICKNESS = 0.3;
export const FRAME_THICKNESS = 0.8;

// Interior boundaries (where fish can swim)
// Account for glass thickness on bottom and sides (no glass on top - open tank)
export const INTERIOR_WIDTH = TANK_WIDTH - (GLASS_THICKNESS * 2);
export const INTERIOR_HEIGHT = TANK_HEIGHT - (GLASS_THICKNESS * 2);
export const INTERIOR_DEPTH = TANK_DEPTH - (GLASS_THICKNESS * 2);

// Water level (below tank rim for realistic appearance)
export const WATER_LEVEL = TANK_HEIGHT / 2 - 1.5;

// Boid simulation bounds (half-dimensions for +/- coordinate system)
// Fish should stay well below the water surface
export const BOUNDS = {
  x: INTERIOR_WIDTH / 2,
  y: WATER_LEVEL - 1.0,  // Keep fish at least 1 unit below water surface
  z: INTERIOR_DEPTH / 2
};
