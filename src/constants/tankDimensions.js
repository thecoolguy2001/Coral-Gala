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
// Account for glass thickness on all sides
export const INTERIOR_WIDTH = TANK_WIDTH - (GLASS_THICKNESS * 2);
export const INTERIOR_HEIGHT = TANK_HEIGHT - (GLASS_THICKNESS * 2);
export const INTERIOR_DEPTH = TANK_DEPTH - (GLASS_THICKNESS * 2);

// Boid simulation bounds (half-dimensions for +/- coordinate system)
export const BOUNDS = {
  x: INTERIOR_WIDTH / 2,
  y: INTERIOR_HEIGHT / 2,
  z: INTERIOR_DEPTH / 2
};
