// src/lib/game/buildings.ts

export type BuildingKind = 'workshop' | 'barracks';

export interface BuildingDefinition {
  name: string;
  description: string;
  baseCost: number;
  // UV coordinates in tiles.png (sx, sy)
  sprite: [number, number]; 
}

export const BUILDINGS: Record<BuildingKind, BuildingDefinition> = {
  workshop: {
    name: "Workshop",
    description: "A place for artisans to craft goods.",
    baseCost: 500,
    sprite: [2, 0], // x=2, y=0 in 16px tiles
  },
  barracks: {
    name: "Barracks",
    description: "Trains and houses your bastion guards.",
    baseCost: 1000,
    sprite: [3, 0], // x=3, y=0 in 16px tiles
  }
};