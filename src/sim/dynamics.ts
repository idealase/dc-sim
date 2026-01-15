/**
 * Core simulation dynamics
 */

import type { 
  GameState, 
  RegionId, 
  CausalEntry,
  TimeSeriesPoint 
} from './model';
import { 
  COOLING_SPECS, 
  calculateFacilityPower 
} from './archetypes';
import { CONFIG, getAverageCarbonIntensity } from './state';
import { RNG } from './rng';

// Update demand based on growth and shocks
export function updateDemand(state: GameState, rng: RNG): GameState {
  const newState = { ...state };
  
  // Base exponential growth
  const baseGrowth = state.aiDemand * CONFIG.demandGrowthRate;
  
  // Small random variation
  const variation = rng.nextFloat(-0.02, 0.02) * state.aiDemand;
  
  newState.aiDemand = state.aiDemand + baseGrowth + variation;
  
  return newState;
}

// Allocate demand across operational data centers
export function allocateDemand(state: GameState): GameState {
  const newState = { ...state };
  
  // Get all operational and grid-connected data centers
  const operationalDCs = Object.values(state.dataCenters)
    .filter(dc => dc.isOperational && dc.isGridConnected);
  
  // Calculate total available capacity
  const totalCapacity = operationalDCs.reduce((sum, dc) => {
    // Reduce capacity if under thermal stress
    const thermalFactor = 1 - (dc.thermalStress * 0.3);
    return sum + dc.computeCapacity * thermalFactor;
  }, 0);
  
  // Serve demand up to capacity
  const demandToServe = state.aiDemand + state.backlog;
  const served = Math.min(demandToServe, totalCapacity);
  const unserved = demandToServe - served;
  
  newState.demandServed = Math.min(served, state.aiDemand);
  newState.backlog = unserved;
  
  // Update stats
  newState.stats = {
    ...state.stats,
    totalDemandServed: state.stats.totalDemandServed + newState.demandServed,
    totalDemandMissed: state.stats.totalDemandMissed + Math.max(0, state.aiDemand - newState.demandServed),
    peakBacklog: Math.max(state.stats.peakBacklog, newState.backlog),
  };
  
  // Distribute utilization across data centers
  if (totalCapacity > 0) {
    const utilizationRatio = Math.min(served / totalCapacity, 1);
    const newDataCenters = { ...state.dataCenters };
    
    for (const dc of operationalDCs) {
      newDataCenters[dc.id] = {
        ...dc,
        currentUtilization: utilizationRatio,
      };
    }
    
    newState.dataCenters = newDataCenters;
  }
  
  // Add causal trace if backlog changed significantly
  if (Math.abs(newState.backlog - state.backlog) > 50) {
    const entry: CausalEntry = {
      tick: state.tick,
      cause: newState.backlog > state.backlog ? 'Demand exceeds capacity' : 'Capacity serving backlog',
      effect: `Backlog ${newState.backlog > state.backlog ? 'increased' : 'decreased'} to ${newState.backlog.toFixed(0)}`,
      metric: 'backlog',
      delta: newState.backlog - state.backlog,
    };
    newState.causalTrace = [...state.causalTrace.slice(-19), entry];
  }
  
  return newState;
}

// Update power consumption and grid state
export function updatePowerAndGrid(state: GameState): GameState {
  const newState = { ...state };
  const newRegions = { ...state.regions };
  let totalEmissionsThisTick = 0;
  
  for (const regionId of Object.keys(state.regions) as RegionId[]) {
    const region = { ...state.regions[regionId] };
    
    // Calculate power from all data centers in this region
    let regionPowerMW = 0;
    for (const dcId of region.dataCenterIds) {
      const dc = state.dataCenters[dcId];
      if (dc && dc.isOperational && dc.isGridConnected) {
        const activeCompute = dc.computeCapacity * dc.currentUtilization;
        const power = calculateFacilityPower(activeCompute, dc.archetype, dc.coolingType);
        regionPowerMW += power;
      }
    }
    
    region.currentGridUsageMW = regionPowerMW;
    
    // Calculate effective grid capacity (including upgrades)
    const upgradeComplete = region.transmissionUpgradeCompleteTick !== null && 
                           state.tick >= region.transmissionUpgradeCompleteTick;
    const effectiveGridMW = region.gridStrengthMW + (upgradeComplete ? region.transmissionUpgradeMW : 0);
    
    // Battery can offset peak usage
    const batteryOffset = Math.min(region.batteryCapacityMWh * 0.25, regionPowerMW * 0.1);
    const netGridDraw = Math.max(0, regionPowerMW - batteryOffset);
    
    region.gridReserveMarginMW = effectiveGridMW - netGridDraw;
    
    // Brownout detection
    region.hasBrownout = region.gridReserveMarginMW < 0;
    
    // Calculate emissions for this region
    const renewableReduction = region.renewablePPAMW > 0 
      ? Math.min(0.5, (region.renewablePPAMW / Math.max(regionPowerMW, 1)) * 0.5)
      : 0;
    const effectiveCarbonIntensity = region.baselineCarbonIntensity * (1 - renewableReduction);
    const hoursPerWeek = 168;
    const mwhThisWeek = regionPowerMW * hoursPerWeek / 1000; // Convert to MWh properly
    const emissionsThisWeek = (mwhThisWeek * effectiveCarbonIntensity) / 1000; // Tonnes CO2
    totalEmissionsThisTick += emissionsThisWeek;
    
    newRegions[regionId] = region;
  }
  
  newState.regions = newRegions;
  newState.currentEmissions = state.currentEmissions + totalEmissionsThisTick;
  newState.stats = {
    ...state.stats,
    totalCarbonEmissions: state.stats.totalCarbonEmissions + totalEmissionsThisTick,
  };
  
  // Track brownouts in causal trace
  const brownoutRegions = Object.values(newRegions).filter(r => r.hasBrownout);
  if (brownoutRegions.length > 0) {
    newState.stats = { 
      ...newState.stats, 
      brownoutCount: state.stats.brownoutCount + brownoutRegions.length 
    };
    
    for (const region of brownoutRegions) {
      newState.causalTrace = [...newState.causalTrace.slice(-19), {
        tick: state.tick,
        cause: `Grid overload in ${region.name}`,
        effect: 'Brownout triggered',
        metric: 'gridReserveMarginMW',
        delta: region.gridReserveMarginMW,
      }];
    }
  }
  
  return newState;
}

// Update thermal state for data centers
export function updateThermal(state: GameState): GameState {
  const newState = { ...state };
  const newDataCenters = { ...state.dataCenters };
  
  for (const dc of Object.values(state.dataCenters)) {
    if (!dc.isOperational) continue;
    
    const newDC = { ...dc };
    const region = state.regions[dc.regionId];
    const coolingSpec = COOLING_SPECS[dc.coolingType];
    
    // Calculate heat generation based on utilization
    const activeCompute = dc.computeCapacity * dc.currentUtilization;
    const facilityPower = calculateFacilityPower(activeCompute, dc.archetype, dc.coolingType);
    
    // Heat stress increases when power exceeds cooling capacity
    const coolingRatio = facilityPower / dc.coolingCapacityMW;
    
    // Heatwave increases thermal stress
    const heatwavePenalty = region.hasHeatwave ? 
      CONFIG.heatwaveThermalIncrease * coolingSpec.heatwaveVulnerability : 0;
    
    if (coolingRatio > 1) {
      // Overloaded - thermal stress increases
      newDC.thermalStress = Math.min(
        CONFIG.maxThermalStress,
        dc.thermalStress + (coolingRatio - 1) * 0.2 + heatwavePenalty
      );
    } else {
      // Cooling sufficient - thermal stress recovers
      newDC.thermalStress = Math.max(
        0,
        dc.thermalStress - CONFIG.thermalRecoveryRate + heatwavePenalty
      );
    }
    
    newDataCenters[dc.id] = newDC;
  }
  
  // Track thermal trips
  const thermalTrips = Object.values(newDataCenters).filter(
    dc => dc.thermalStress >= CONFIG.thermalStressFailure
  );
  
  if (thermalTrips.length > 0) {
    newState.stats = {
      ...state.stats,
      thermalTripCount: state.stats.thermalTripCount + thermalTrips.length,
    };
    
    for (const dc of thermalTrips) {
      newState.causalTrace = [...(newState.causalTrace || state.causalTrace).slice(-19), {
        tick: state.tick,
        cause: `Thermal overload in ${dc.id}`,
        effect: 'Thermal trip - capacity reduced',
        metric: 'thermalStress',
        delta: dc.thermalStress,
      }];
    }
  }
  
  newState.dataCenters = newDataCenters;
  return newState;
}

// Update public acceptance based on operations
export function updatePublicAcceptance(state: GameState): GameState {
  const newState = { ...state };
  const newRegions = { ...state.regions };
  
  for (const regionId of Object.keys(state.regions) as RegionId[]) {
    const region = { ...state.regions[regionId] };
    
    // Factors that decrease acceptance
    let acceptanceChange = 0;
    
    if (region.hasBrownout) {
      acceptanceChange -= 3;
    }
    
    // High water usage in water-stressed regions
    if (region.waterStress > 0.5 && region.dataCenterIds.length > 0) {
      let waterUsage = 0;
      for (const dcId of region.dataCenterIds) {
        const dc = state.dataCenters[dcId];
        if (dc && dc.isOperational) {
          waterUsage += COOLING_SPECS[dc.coolingType].waterUsage * dc.currentUtilization;
        }
      }
      if (waterUsage > 0.5) {
        acceptanceChange -= waterUsage * region.waterStress;
      }
    }
    
    // Community investment improves acceptance
    if (region.communityInvestment > 0) {
      acceptanceChange += region.communityInvestment * 0.05;
    }
    
    // Natural drift toward neutral (50)
    const drift = (50 - region.publicAcceptance) * 0.01;
    acceptanceChange += drift;
    
    region.publicAcceptance = Math.max(0, Math.min(100, region.publicAcceptance + acceptanceChange));
    
    // Update permitting delay based on acceptance
    if (region.publicAcceptance < 40) {
      region.permittingDelayWeeks = Math.min(20, region.permittingDelayWeeks + 0.5);
    } else if (region.publicAcceptance > 60) {
      region.permittingDelayWeeks = Math.max(0, region.permittingDelayWeeks - 0.2);
    }
    
    newRegions[regionId] = region;
  }
  
  newState.regions = newRegions;
  return newState;
}

// Process pending actions (builds, upgrades)
export function processPendingActions(state: GameState): GameState {
  const newState = { ...state };
  const completedActions: string[] = [];
  const newDataCenters = { ...state.dataCenters };
  const newRegions = { ...state.regions };
  
  for (const action of state.pendingActions) {
    // Check for build completion
    if (action.type === 'build_datacenter' && state.tick >= action.completeTick) {
      const dcId = action.params.dataCenterId as string;
      if (newDataCenters[dcId]) {
        newDataCenters[dcId] = {
          ...newDataCenters[dcId],
          isOperational: true,
        };
      }
      completedActions.push(action.id);
      
      newState.events = [...state.events, {
        id: `event_dc_built_${dcId}`,
        tick: state.tick,
        type: 'datacenter_online',
        message: `🏗️ Data center ${dcId} construction complete`,
        severity: 'info',
        regionId: action.regionId,
      }];
    }
    
    // Check for grid connection
    if (action.type === 'build_datacenter') {
      const dcId = action.params.dataCenterId as string;
      const gridConnectTick = action.params.gridConnectTick as number;
      if (state.tick >= gridConnectTick && newDataCenters[dcId] && !newDataCenters[dcId].isGridConnected) {
        newDataCenters[dcId] = {
          ...newDataCenters[dcId],
          isGridConnected: true,
        };
        
        newState.events = [...(newState.events || state.events), {
          id: `event_dc_grid_${dcId}`,
          tick: state.tick,
          type: 'datacenter_online',
          message: `⚡ Data center ${dcId} now grid-connected`,
          severity: 'info',
          regionId: action.regionId,
        }];
      }
    }
    
    // Check for upgrade completions
    if (action.type === 'upgrade_transmission' && state.tick >= action.completeTick && action.regionId) {
      const region = { ...newRegions[action.regionId] };
      region.transmissionUpgradeMW = (action.params.upgradeMW as number) || 50;
      region.transmissionUpgradeCompleteTick = state.tick;
      newRegions[action.regionId] = region;
      completedActions.push(action.id);
      
      newState.events = [...(newState.events || state.events), {
        id: `event_upgrade_${action.id}`,
        tick: state.tick,
        type: 'upgrade_complete',
        message: `⚡ Transmission upgrade complete in ${region.name}`,
        severity: 'info',
        regionId: action.regionId,
      }];
    }
    
    if (action.type === 'add_battery' && state.tick >= action.completeTick && action.regionId) {
      const region = { ...newRegions[action.regionId] };
      region.batteryCapacityMWh += (action.params.capacityMWh as number) || 50;
      newRegions[action.regionId] = region;
      completedActions.push(action.id);
    }
    
    if (action.type === 'sign_renewable_ppa' && state.tick >= action.completeTick && action.regionId) {
      const region = { ...newRegions[action.regionId] };
      region.renewablePPAMW += (action.params.capacityMW as number) || 20;
      newRegions[action.regionId] = region;
      completedActions.push(action.id);
    }
    
    if (action.type === 'community_investment' && state.tick >= action.completeTick && action.regionId) {
      const region = { ...newRegions[action.regionId] };
      region.communityInvestment += 1;
      region.publicAcceptance = Math.min(100, region.publicAcceptance + 10);
      newRegions[action.regionId] = region;
      completedActions.push(action.id);
    }
    
    if (action.type === 'upgrade_cooling' && state.tick >= action.completeTick) {
      const dcId = action.dataCenterId;
      if (dcId && newDataCenters[dcId]) {
        newDataCenters[dcId] = {
          ...newDataCenters[dcId],
          coolingCapacityMW: newDataCenters[dcId].coolingCapacityMW * 1.2,
        };
      }
      completedActions.push(action.id);
    }
  }
  
  newState.dataCenters = newDataCenters;
  newState.regions = newRegions;
  newState.pendingActions = state.pendingActions.filter(a => !completedActions.includes(a.id));
  
  return newState;
}

// Record time series data point
export function recordTimeSeries(state: GameState): GameState {
  const totalPower = Object.values(state.regions).reduce((sum, r) => sum + r.currentGridUsageMW, 0);
  const totalGridCapacity = Object.values(state.regions).reduce((sum, r) => {
    const upgraded = r.transmissionUpgradeCompleteTick !== null && 
                     state.tick >= r.transmissionUpgradeCompleteTick
                     ? r.transmissionUpgradeMW : 0;
    return sum + r.gridStrengthMW + upgraded;
  }, 0);
  
  const point: TimeSeriesPoint = {
    tick: state.tick,
    demand: state.aiDemand,
    served: state.demandServed,
    backlog: state.backlog,
    totalPowerMW: totalPower,
    totalGridCapacityMW: totalGridCapacity,
    avgCarbonIntensity: getAverageCarbonIntensity(state),
    cumulativeEmissions: state.currentEmissions,
  };
  
  return {
    ...state,
    timeSeries: [...state.timeSeries, point],
  };
}

// Update budget (income and recurring costs)
export function updateBudget(state: GameState): GameState {
  const operationalDCs = Object.values(state.dataCenters).filter(dc => dc.isOperational).length;
  const maintenanceCost = operationalDCs * 2; // 2 per DC per week
  
  return {
    ...state,
    budget: state.budget + CONFIG.weeklyBudgetIncome - maintenanceCost,
  };
}
