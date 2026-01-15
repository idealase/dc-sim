/**
 * Data center archetype specifications
 */

import type { ArchetypeSpec, DataCenterArchetype, CoolingType } from './model';

export const ARCHETYPES: Record<DataCenterArchetype, ArchetypeSpec> = {
  hyperscale: {
    name: 'Hyperscale',
    computeCapacity: 1000,
    coolingCapacityMW: 120,
    buildTimeWeeks: 16, // Reduced from 24
    gridConnectWeeks: 8, // Reduced from 16
    baseCost: 450, // Slightly cheaper
    powerPerComputeUnit: 0.1, // 100 kW per compute unit
    pue: 1.2,
    minPermittingWeeks: 8, // Reduced from 12
  },
  modular: {
    name: 'Modular',
    computeCapacity: 200,
    coolingCapacityMW: 30,
    buildTimeWeeks: 4, // Reduced from 8
    gridConnectWeeks: 2, // Reduced from 4
    baseCost: 100, // Cheaper
    powerPerComputeUnit: 0.12,
    pue: 1.4,
    minPermittingWeeks: 2, // Reduced from 4
  },
  retrofit: {
    name: 'Retrofit',
    computeCapacity: 300,
    coolingCapacityMW: 40,
    buildTimeWeeks: 6, // Reduced from 12
    gridConnectWeeks: 3, // Reduced from 6
    baseCost: 70, // Cheaper
    powerPerComputeUnit: 0.15,
    pue: 1.6,
    minPermittingWeeks: 1, // Reduced from 2
  },
  edge: {
    name: 'Edge',
    computeCapacity: 50,
    coolingCapacityMW: 8,
    buildTimeWeeks: 2, // Reduced from 4
    gridConnectWeeks: 1, // Reduced from 2
    baseCost: 40, // Cheaper
    powerPerComputeUnit: 0.18,
    pue: 1.5,
    minPermittingWeeks: 0, // Instant permitting
  },
};

// Cooling type modifiers
export const COOLING_SPECS: Record<CoolingType, {
  name: string;
  efficiencyBonus: number; // Reduces PUE
  waterUsage: number; // Relative water consumption 0-1
  cost: number;
  heatwaveVulnerability: number; // 0-1, how much heatwaves affect it
}> = {
  air: {
    name: 'Air Cooling',
    efficiencyBonus: 0,
    waterUsage: 0.1,
    cost: 0,
    heatwaveVulnerability: 0.8,
  },
  evaporative: {
    name: 'Evaporative Cooling',
    efficiencyBonus: 0.1,
    waterUsage: 0.8,
    cost: 20,
    heatwaveVulnerability: 0.5,
  },
  liquid: {
    name: 'Liquid Cooling',
    efficiencyBonus: 0.2,
    waterUsage: 0.3,
    cost: 50,
    heatwaveVulnerability: 0.2,
  },
};

// Upgrade costs
export const UPGRADE_COSTS = {
  coolingUpgrade: 30, // Increases cooling capacity by 20%
  transmissionUpgrade: 100, // +50 MW grid capacity
  battery: 80, // per 50 MWh
  renewablePPA: 60, // per 20 MW
  communityInvestment: 25, // +10 public acceptance
};

// Upgrade delays (weeks)
export const UPGRADE_DELAYS = {
  coolingUpgrade: 4,
  transmissionUpgrade: 20,
  battery: 8,
  renewablePPA: 2,
  communityInvestment: 6,
};

// Get effective PUE for a data center
export function getEffectivePUE(archetype: DataCenterArchetype, coolingType: CoolingType): number {
  const base = ARCHETYPES[archetype].pue;
  const bonus = COOLING_SPECS[coolingType].efficiencyBonus;
  return base - bonus;
}

// Calculate IT power for a data center
export function calculateITPower(computeActive: number, archetype: DataCenterArchetype): number {
  return computeActive * ARCHETYPES[archetype].powerPerComputeUnit;
}

// Calculate facility power (including cooling overhead)
export function calculateFacilityPower(
  computeActive: number,
  archetype: DataCenterArchetype,
  coolingType: CoolingType
): number {
  const itPower = calculateITPower(computeActive, archetype);
  const pue = getEffectivePUE(archetype, coolingType);
  return itPower * pue;
}

// Get permitting delay for a build
export function getPermittingDelay(
  archetype: DataCenterArchetype,
  publicAcceptance: number,
  permittingFriction: number
): number {
  const baseDelay = ARCHETYPES[archetype].minPermittingWeeks;
  const frictionMultiplier = 1 + permittingFriction * 2;
  const acceptanceMultiplier = 2 - (publicAcceptance / 100);
  return Math.ceil(baseDelay * frictionMultiplier * acceptanceMultiplier);
}
