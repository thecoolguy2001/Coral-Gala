import { serverTimestamp } from 'firebase/firestore';

// Fish personality traits
export const PERSONALITY_TRAITS = {
  PLAYFUL: 'playful',
  SHY: 'shy', 
  AGGRESSIVE: 'aggressive',
  FRIENDLY: 'friendly',
  CURIOUS: 'curious',
  LAZY: 'lazy',
  ENERGETIC: 'energetic',
  CALM: 'calm'
};

// Fish species with characteristics
export const FISH_SPECIES = {
  CLOWNFISH: {
    name: 'Clownfish',
    averageSize: 0.4,
    baseSpeed: 2.0,
    favoriteFood: 'algae',
    colors: ['#FF6B35', '#F7931E', '#FFFFFF'],
    traits: [PERSONALITY_TRAITS.PLAYFUL, PERSONALITY_TRAITS.FRIENDLY]
  },
  ANGELFISH: {
    name: 'Angelfish',
    averageSize: 0.6,
    baseSpeed: 1.5,
    favoriteFood: 'flakes',
    colors: ['#FFD700', '#FFA500', '#FFFFFF'],
    traits: [PERSONALITY_TRAITS.CALM, PERSONALITY_TRAITS.CURIOUS]
  },
  NEMO: {
    name: 'Nemo Fish',
    averageSize: 0.3,
    baseSpeed: 2.5,
    favoriteFood: 'brine shrimp',
    colors: ['#FF4500', '#FFFFFF', '#000000'],
    traits: [PERSONALITY_TRAITS.ENERGETIC, PERSONALITY_TRAITS.CURIOUS]
  },
  TANG: {
    name: 'Blue Tang',
    averageSize: 0.5,
    baseSpeed: 1.8,
    favoriteFood: 'seaweed',
    colors: ['#0066CC', '#87CEEB', '#FFFFFF'],
    traits: [PERSONALITY_TRAITS.SHY, PERSONALITY_TRAITS.CALM]
  }
};

// Create a new fish with full stats
export const createFish = (overrides = {}) => {
  // Handle species - could be string or species object
  let speciesObj = FISH_SPECIES.CLOWNFISH; // default
  let speciesName = 'Clownfish'; // default
  
  if (typeof overrides.species === 'string') {
    // Species passed as string name
    speciesName = overrides.species;
    // Find matching species object
    speciesObj = Object.values(FISH_SPECIES).find(s => s.name === overrides.species) || FISH_SPECIES.CLOWNFISH;
  } else if (overrides.species && typeof overrides.species === 'object') {
    // Species passed as object
    speciesObj = overrides.species;
    speciesName = speciesObj.name;
  }
  
  const traits = overrides.traits || speciesObj.traits || [PERSONALITY_TRAITS.FRIENDLY];
  
  return {
    // Basic Info
    id: overrides.id || `fish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: overrides.name || 'Unnamed Fish',
    species: speciesName, // Always use string for species
    age: overrides.age || Math.floor(Math.random() * 12) + 1, // 1-12 months
    color: overrides.color || speciesObj.colors?.[0] || '#FF6B35', // Use bright orange instead of yellowish-grey
    
    // Physical Properties
    size: overrides.size || Math.max(0.6, speciesObj.averageSize * (0.8 + Math.random() * 0.4)), // ±20% variation, minimum 0.6
    speed: overrides.speed || (speciesObj.baseSpeed * (0.9 + Math.random() * 0.2)), // ±10% variation
    
    // Position in tank - spread across full screen with minimal depth
    position: overrides.position || [
      (Math.random() - 0.5) * 60, // Much wider spread
      (Math.random() - 0.5) * 40, // Taller spread
      (Math.random() - 0.5) * 8   // Very shallow depth
    ],
    
    // Health Stats (0-100)
    hunger: overrides.hunger !== undefined ? overrides.hunger : Math.floor(Math.random() * 30) + 70, // Start well-fed
    health: overrides.health !== undefined ? overrides.health : Math.floor(Math.random() * 20) + 80, // Start healthy
    mood: overrides.mood !== undefined ? overrides.mood : Math.floor(Math.random() * 40) + 60, // Start content
    energy: overrides.energy !== undefined ? overrides.energy : Math.floor(Math.random() * 30) + 70, // Start energetic
    
    // Personality
    personality: {
      traits: traits,
      primary: traits[0],
      friendliness: overrides.personality?.friendliness !== undefined ? overrides.personality.friendliness : Math.floor(Math.random() * 50) + 50, // 50-100
      playfulness: overrides.personality?.playfulness !== undefined ? overrides.personality.playfulness : Math.floor(Math.random() * 100),
      shyness: overrides.personality?.shyness !== undefined ? overrides.personality.shyness : Math.floor(Math.random() * 100),
    },
    
    // Preferences
    preferences: {
      favoriteFood: speciesObj.favoriteFood || 'fish flakes',
      temperature: Math.floor(Math.random() * 4) + 76, // 76-80°F
      depth: ['surface', 'middle', 'bottom'][Math.floor(Math.random() * 3)],
    },
    
    // History & Stats
    history: {
      acquiredAt: overrides.acquiredAt || serverTimestamp(),
      timesFed: overrides.timesFed || 0,
      timesPetted: overrides.timesPetted || 0,
      totalTimeInTank: overrides.totalTimeInTank || 0, // hours
      lastFed: overrides.lastFed || null,
      lastPetted: overrides.lastPetted || null,
    },
    
    // Special States
    states: {
      isEating: false,
      isBeingPetted: false,
      isHungry: false,
      isSick: false,
      isHappy: true,
      lastStateChange: Date.now(),
    },
    
    // Display Properties
    display: {
      nickname: overrides.nickname || overrides.display?.nickname || null,
      bio: overrides.bio || overrides.display?.bio || generateRandomBio(traits),
      achievements: overrides.achievements || overrides.display?.achievements || [],
    },
    
    // Metadata
    createdAt: overrides.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: '1.0',
  };
};

// Generate a random bio based on personality traits
const generateRandomBio = (traits) => {
  const bios = {
    [PERSONALITY_TRAITS.PLAYFUL]: [
      "Loves to chase bubbles and play with tank decorations!",
      "Always looking for the next fun adventure in the tank.",
      "Can often be found doing loops and showing off swimming tricks."
    ],
    [PERSONALITY_TRAITS.SHY]: [
      "Prefers quiet corners and hiding spots in the tank.",
      "Takes time to warm up to new tank mates.",
      "Enjoys peaceful moments away from the action."
    ],
    [PERSONALITY_TRAITS.FRIENDLY]: [
      "Loves meeting new fish and making friends!",
      "Always ready to welcome newcomers to the tank.",
      "Enjoys swimming alongside other fish."
    ],
    [PERSONALITY_TRAITS.CURIOUS]: [
      "Always exploring every nook and cranny of the tank.",
      "First to investigate anything new in the water.",
      "Has a keen eye for discovering hidden treasures."
    ],
    [PERSONALITY_TRAITS.ENERGETIC]: [
      "Never stops moving and loves to race around the tank!",
      "Has boundless energy and enthusiasm for life.",
      "Keeps everyone else active with their high energy."
    ],
    [PERSONALITY_TRAITS.CALM]: [
      "Brings a sense of peace and tranquility to the tank.",
      "Enjoys slow, graceful swims and quiet meditation.",
      "Has a calming presence that soothes other fish."
    ]
  };
  
  const trait = traits[0] || PERSONALITY_TRAITS.FRIENDLY;
  const traitBios = bios[trait] || bios[PERSONALITY_TRAITS.FRIENDLY];
  return traitBios[Math.floor(Math.random() * traitBios.length)];
};

// Update fish stats over time
export const updateFishStats = (fish, deltaTime) => {
  const updated = { ...fish };
  
  // Hunger decreases over time
  updated.hunger = Math.max(0, updated.hunger - (deltaTime * 0.1)); // Loses 0.1 hunger per second
  
  // Health affected by hunger
  if (updated.hunger < 20) {
    updated.health = Math.max(0, updated.health - (deltaTime * 0.05));
  } else if (updated.hunger > 80) {
    updated.health = Math.min(100, updated.health + (deltaTime * 0.02));
  }
  
  // Mood affected by hunger and health
  updated.mood = Math.max(0, Math.min(100, 
    (updated.hunger * 0.4) + (updated.health * 0.6)
  ));
  
  // Energy affected by mood
  updated.energy = Math.max(0, Math.min(100,
    updated.energy + (updated.mood > 50 ? 0.01 : -0.02) * deltaTime
  ));
  
  // Update states based on stats
  updated.states.isHungry = updated.hunger < 30;
  updated.states.isSick = updated.health < 40;
  updated.states.isHappy = updated.mood > 60;
  
  updated.updatedAt = serverTimestamp();
  
  return updated;
};

// Feed a fish
export const feedFish = (fish, foodType = 'flakes') => {
  const updated = { ...fish };
  
  // Increase hunger based on food type
  const foodEffectiveness = foodType === fish.preferences.favoriteFood ? 1.2 : 1.0;
  updated.hunger = Math.min(100, updated.hunger + (25 * foodEffectiveness));
  
  // Increase mood slightly
  updated.mood = Math.min(100, updated.mood + 10);
  
  // Update history
  updated.history.timesFed += 1;
  updated.history.lastFed = serverTimestamp();
  
  // Set eating state
  updated.states.isEating = true;
  updated.states.lastStateChange = Date.now();
  
  updated.updatedAt = serverTimestamp();
  
  return updated;
};

// Pet a fish
export const petFish = (fish) => {
  const updated = { ...fish };
  
  // Increase mood and energy
  updated.mood = Math.min(100, updated.mood + 15);
  updated.energy = Math.min(100, updated.energy + 10);
  
  // Update history
  updated.history.timesPetted += 1;
  updated.history.lastPetted = serverTimestamp();
  
  // Set petting state
  updated.states.isBeingPetted = true;
  updated.states.lastStateChange = Date.now();
  
  updated.updatedAt = serverTimestamp();
  
  return updated;
};

// Default fish for the aquarium
export const getDefaultFish = () => [
  createFish({
    id: 'phillip',
    name: 'Phillip',
    species: 'Clownfish', // Use string directly, not object
    position: [-20, 8, -2],
    age: 8,
    color: '#FF6B35',
    personality: {
      traits: [PERSONALITY_TRAITS.PLAYFUL, PERSONALITY_TRAITS.ENERGETIC],
      primary: PERSONALITY_TRAITS.PLAYFUL,
      friendliness: 85,
      playfulness: 95,
      shyness: 20,
    },
    display: {
      nickname: 'Phil',
      bio: "The tank's unofficial comedian! Phillip loves putting on shows and making everyone laugh with his acrobatic swimming.",
      achievements: ['Tank Comedian', 'Bubble Master', 'Speed Swimmer'],
    },
    hunger: 75,
    health: 90,
    mood: 85,
    energy: 95,
  }),
  
  createFish({
    id: 'jojo',
    name: 'Jojo',
    species: 'Angelfish', // Use string directly
    position: [25, -8, 3],
    age: 6,
    color: '#FFD700',
    personality: {
      traits: [PERSONALITY_TRAITS.CALM, PERSONALITY_TRAITS.FRIENDLY],
      primary: PERSONALITY_TRAITS.CALM,
      friendliness: 90,
      playfulness: 50,
      shyness: 30,
    },
    display: {
      nickname: 'JoJo',
      bio: "The wise elder of the tank. Jojo brings peace and wisdom to everyone around, always ready with a gentle fin when needed.",
      achievements: ['Zen Master', 'Peacekeeper', 'Wise One'],
    },
    hunger: 80,
    health: 85,
    mood: 90,
    energy: 70,
  }),
  
  createFish({
    id: 'marina',
    name: 'Marina',
    species: 'Nemo Fish', // Use string directly
    position: [8, 12, -4],
    age: 4,
    color: '#FF4500',
    personality: {
      traits: [PERSONALITY_TRAITS.CURIOUS, PERSONALITY_TRAITS.ENERGETIC],
      primary: PERSONALITY_TRAITS.CURIOUS,
      friendliness: 75,
      playfulness: 80,
      shyness: 15,
    },
    display: {
      nickname: 'Mari',
      bio: "The tank's explorer! Marina discovers all the best hiding spots and secret passages. Nothing escapes her keen eye.",
      achievements: ['Explorer', 'Treasure Hunter', 'Adventurer'],
    },
    hunger: 70,
    health: 88,
    mood: 80,
    energy: 85,
  }),
  
  createFish({
    id: 'bubbles',
    name: 'Bubbles',
    species: 'Blue Tang', // Use string directly
    position: [-15, -12, 2],
    age: 10,
    color: '#0066CC',
    personality: {
      traits: [PERSONALITY_TRAITS.SHY, PERSONALITY_TRAITS.CALM],
      primary: PERSONALITY_TRAITS.SHY,
      friendliness: 60,
      playfulness: 40,
      shyness: 85,
    },
    display: {
      nickname: 'Bubs',
      bio: "The gentle soul of the tank. Bubbles prefers quiet moments and cozy corners, but has the biggest heart of all.",
      achievements: ['Gentle Soul', 'Quiet Observer', 'Hidden Depths'],
    },
    hunger: 65,
    health: 82,
    mood: 75,
    energy: 60,
  }),
]; 