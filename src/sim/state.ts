/**
 * Initial game state factory
 */

import type { GameState, RegionId } from './model';
import { createInitialRegions } from './regionData';
import { generateSeed } from './rng';

// Configuration constants
export const CONFIG = {
  // Demand
  initialDemand: 50, // Lower starting demand
  demandGrowthRate: 0.01, // 1% per week (was 3% - much more manageable)
  demandShockMultiplier: 1.3, // Smaller demand spikes
  
  // Failure thresholds
  backlogFailureThreshold: 800, // More forgiving (was 500)
  backlogGraceTicks: 12, // 12 weeks grace period (was 4)
  gridReserveWarningMW: 20,
  gridReserveFailureMW: -10,
  thermalStressFailure: 0.95,
  carbonCapBudget: 80000, // More CO2 budget (was 50000)
  acceptanceFailureThreshold: 15, // Slightly harder to fail via acceptance
  
  // Budget
  initialBudget: 500, // More starting money (was 300)
  weeklyBudgetIncome: 15, // More income (was 10)
  
  // Physics
  maxThermalStress: 1.0,
  thermalRecoveryRate: 0.1,
  heatwaveThermalIncrease: 0.15,
  
  // Timing
  maxTicks: 260, // ~5 years
};

// Create fresh game state
export function createInitialState(seed?: number): GameState {
  const actualSeed = seed ?? generateSeed();
  
  return {
    // Core simulation
    tick: 0,
    isRunning: false,
    isPaused: false,
    isFailed: false,
    failureType: null,
    seed: actualSeed,
    rngState: actualSeed,
    
    // Tutorial
    tutorialStage: 1,
    tutorialCompleted: false,
    stageJustAdvanced: false,
    
    // Resources
    budget: CONFIG.initialBudget,
    
    // Demand
    aiDemand: CONFIG.initialDemand,
    demandServed: 0,
    backlog: 0,
    backlogGraceTicksRemaining: CONFIG.backlogGraceTicks,
    
    // Entities
    regions: createInitialRegions(),
    dataCenters: {},
    pendingActions: [],
    
    // History
    events: [],
    causalTrace: [],
    timeSeries: [],
    
    // Stats
    stats: {
      totalDemandServed: 0,
      totalDemandMissed: 0,
      totalCarbonEmissions: 0,
      totalWaterUsed: 0,
      totalBudgetSpent: 0,
      peakBacklog: 0,
      brownoutCount: 0,
      thermalTripCount: 0,
      dataCentersBuilt: 0,
      weeksCompleted: 0,
    },
    
    // Carbon
    carbonCapBudget: CONFIG.carbonCapBudget,
    currentEmissions: 0,
    carbonWarningIssued: false,
  };
}

// Get total compute capacity across all operational data centers
export function getTotalComputeCapacity(state: GameState): number {
  return Object.values(state.dataCenters)
    .filter(dc => dc.isOperational && dc.isGridConnected)
    .reduce((sum, dc) => sum + dc.computeCapacity, 0);
}

// Get compute capacity for a specific region
export function getRegionComputeCapacity(state: GameState, regionId: RegionId): number {
  const region = state.regions[regionId];
  return region.dataCenterIds
    .map(id => state.dataCenters[id])
    .filter(dc => dc && dc.isOperational && dc.isGridConnected)
    .reduce((sum, dc) => sum + dc.computeCapacity, 0);
}

// Get total facility power usage
export function getTotalFacilityPower(state: GameState): number {
  return Object.values(state.regions).reduce((sum, r) => sum + r.currentGridUsageMW, 0);
}

// Get total grid capacity
export function getTotalGridCapacity(state: GameState): number {
  return Object.values(state.regions).reduce((sum, r) => {
    const upgraded = r.transmissionUpgradeCompleteTick !== null && 
                     state.tick >= r.transmissionUpgradeCompleteTick
                     ? r.transmissionUpgradeMW : 0;
    return sum + r.gridStrengthMW + upgraded;
  }, 0);
}

// Calculate average carbon intensity weighted by power usage
export function getAverageCarbonIntensity(state: GameState): number {
  const regions = Object.values(state.regions);
  const totalPower = regions.reduce((sum, r) => sum + r.currentGridUsageMW, 0);
  
  if (totalPower === 0) return 0;
  
  const weightedSum = regions.reduce((sum, r) => {
    // Renewable PPAs reduce effective carbon intensity
    const renewableReduction = r.renewablePPAMW > 0 
      ? Math.min(0.5, (r.renewablePPAMW / Math.max(r.currentGridUsageMW, 1)) * 0.5)
      : 0;
    const effectiveIntensity = r.baselineCarbonIntensity * (1 - renewableReduction);
    return sum + r.currentGridUsageMW * effectiveIntensity;
  }, 0);
  
  return weightedSum / totalPower;
}
