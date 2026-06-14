import { Fish, PondStructure, DeviceStatus } from '../types';

export const FISH_SPECIES = [
  { name: 'Ikan Mas', avgDepth: 2.2, size: 'medium', weightRange: [0.5, 3.2] },
  { name: 'Ikan Nila', avgDepth: 1.4, size: 'small', weightRange: [0.2, 0.9] },
  { name: 'Ikan Patin', avgDepth: 3.5, size: 'large', weightRange: [1.5, 6.5] },
  { name: 'Ikan Gurame', avgDepth: 1.2, size: 'large', weightRange: [0.8, 3.5] },
  { name: 'Ikan Lele', avgDepth: 3.8, size: 'medium', weightRange: [0.4, 2.5] },
  { name: 'Ikan Bawal', avgDepth: 2.0, size: 'medium', weightRange: [0.5, 2.0] },
];

export function generateInitialFishes(count = 10, maxDepth = 5): Fish[] {
  const fishes: Fish[] = [];
  for (let i = 0; i < count; i++) {
    const sp = FISH_SPECIES[Math.floor(Math.random() * FISH_SPECIES.length)];
    const id = `fish_${Math.random().toString(36).substring(2, 7)}`;
    const size = sp.size as 'small' | 'medium' | 'large';
    const weight = Number((Math.random() * (sp.weightRange[1] - sp.weightRange[0]) + sp.weightRange[0]).toFixed(2));
    
    // Position x from 5 to 95 percent
    const x = Math.random() * 90 + 5;
    
    // Depth around its average preferred depth (avoiding outside 0 to maxDepth)
    const preferredDepth = sp.avgDepth + (Math.random() * 1.2 - 0.6);
    const depth = Math.max(0.3, Math.min(maxDepth - 0.2, preferredDepth));
    const y = (depth / maxDepth) * 100; // y coordinate as percentage of depth

    fishes.push({
      id,
      x,
      y,
      depth: Number(depth.toFixed(1)),
      size,
      weight,
      speed: Math.random() * 0.4 + 0.15,
      direction: Math.random() > 0.5 ? 1 : -1,
      species: sp.name,
      active: true
    });
  }
  return fishes;
}

export function updateFishPositions(
  fishes: Fish[], 
  structures: PondStructure[], 
  maxDepth: number,
  deltaTime: number // typically around 0.016 for 60fps
): Fish[] {
  return fishes.map(fish => {
    let targetX = fish.x;
    let targetY = fish.y;
    let hasTarget = false;

    // 1. Check for bait food first (highly attractive)
    const foods = structures.filter(s => s.type === 'food' && (s.amount ?? 0) > 0);
    if (foods.length > 0) {
      // Find closest food
      let minDistance = 999;
      let closestFood: PondStructure | null = null;
      for (const food of foods) {
        const dx = food.x - fish.x;
        const dy = food.y - fish.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance && dist < 45) { // Attraction distance
          minDistance = dist;
          closestFood = food;
        }
      }

      if (closestFood) {
        targetX = closestFood.x;
        targetY = closestFood.y;
        hasTarget = true;
      }
    }

    // 2. Check for underwater structures (rock / log) if no food
    if (!hasTarget) {
      const shelters = structures.filter(s => s.type === 'rock' || s.type === 'log');
      if (shelters.length > 0) {
        // 40% chance of staying near shelter
        let minDistance = 999;
        let closestShelter: PondStructure | null = null;
        for (const shelter of shelters) {
          const dx = shelter.x - fish.x;
          const dy = shelter.y - fish.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance && dist < 30) {
            minDistance = dist;
            closestShelter = shelter;
          }
        }
        if (closestShelter && Math.random() < 0.2) {
          // Hover slightly offset from shelter
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * closestShelter.radius * 0.8;
          targetX = closestShelter.x + Math.cos(angle) * r;
          targetY = closestShelter.y + Math.sin(angle) * (r * 0.5); // squished y
          hasTarget = true;
        }
      }
    }

    let nextX = fish.x;
    let nextY = fish.y;

    if (hasTarget) {
      // Move towards target smoothly
      const speedCoeff = fish.speed * 1.5;
      const dx = targetX - fish.x;
      const dy = targetY - fish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 2) {
        nextX += (dx / distance) * speedCoeff * deltaTime * 60;
        nextY += (dy / distance) * (speedCoeff * 0.6) * deltaTime * 60;
      } else {
        // If reached food, wiggle slightly
        nextX += (Math.random() - 0.5) * 0.5;
        nextY += (Math.random() - 0.5) * 0.3;
      }
    } else {
      // Swim normally
      // Add slight sin wave to vertical motion
      const wave = Math.sin(Date.now() / 1500 + Number(fish.id.charCodeAt(5) || 5)) * 0.25;
      
      nextX += fish.direction * fish.speed * deltaTime * 60;
      nextY += wave;

      // Handle hitting walls (wrap or turn around)
      if (nextX < -5) {
        nextX = 105; // warp to other side for natural sonar flow
      } else if (nextX > 105) {
        nextX = -5;
      }

      // Occasional direction changes
      if (Math.random() < 0.005) {
        fish.direction = fish.direction === 1 ? -1 : 1;
      }
    }

    // Secure boundary constraints (depth range)
    nextY = Math.max(8, Math.min(90, nextY));

    return {
      ...fish,
      x: nextX,
      y: nextY,
      depth: Number(((nextY / 100) * maxDepth).toFixed(1))
    };
  });
}
