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

// Substrate dimensions (sand at bottom)
const SUBSTRATE_HEIGHT = 0.6;
const SUBSTRATE_Y_POSITION = -TANK_HEIGHT / 2 + 0.3;
const SUBSTRATE_TOP = SUBSTRATE_Y_POSITION + SUBSTRATE_HEIGHT / 2;

// Fish swim boundaries - STRICT CONTAINMENT
// Fish MUST stay well within visible tank area
const FISH_Y_MIN = SUBSTRATE_TOP + 1.0;  // 1 unit above substrate
const FISH_Y_MAX = WATER_LEVEL - 2.0;    // 2 units below water surface

export const BOUNDS = {
  x: INTERIOR_WIDTH / 2 - 2.0,    // 2 units from side walls = 17.7
  yMin: FISH_Y_MIN,                // -11.4
  yMax: FISH_Y_MAX,                // 9.0
  z: INTERIOR_DEPTH / 2 - 2.0     // 2 units from front/back = 7.7
};

// Log bounds for debugging
console.log('🐠 FISH BOUNDS:', {
  x: `±${BOUNDS.x}`,
  y: `${BOUNDS.yMin} to ${BOUNDS.yMax}`,
  z: `±${BOUNDS.z}`,
  tankDimensions: { width: TANK_WIDTH, height: TANK_HEIGHT, depth: TANK_DEPTH },
  waterLevel: WATER_LEVEL
});
