/**
 * Main simulation engine - step function and action processing
 */

import type { GameState, PlayerAction, RegionId, DataCenterArchetype, CoolingType } from './model';
import { RNG } from './rng';
import { ARCHETYPES, UPGRADE_COSTS, UPGRADE_DELAYS, getPermittingDelay } from './archetypes';
import {
  updateDemand,
  allocateDemand,
  updatePowerAndGrid,
  updateThermal,
  updatePublicAcceptance,
  processPendingActions,
  recordTimeSeries,
  updateBudget,
} from './dynamics';
import { generateEvents, applyEventEffects, generateWarningEvents } from './events';
import { checkFailureConditions } from './scoring';
import { checkTutorialProgression, isActionUnlocked } from './tutorial';

let actionCounter = 0;
let dcCounter = 0;

/**
 * Process a single simulation tick
 */
export function step(state: GameState): GameState {
  if (!state.isRunning || state.isPaused || state.isFailed) {
    return state;
  }
  
  // Create RNG from current state
  const rng = RNG.fromState(state.rngState);
  
  let newState = { ...state, tick: state.tick + 1, stageJustAdvanced: false };
  
  // 1. Update demand
  newState = updateDemand(newState, rng);
  
  // 2. Process pending actions (builds complete, upgrades finish)
  newState = processPendingActions(newState);
  
  // 3. Allocate demand to data centers
  newState = allocateDemand(newState);
  
  // 4. Update power consumption and grid state
  newState = updatePowerAndGrid(newState);
  
  // 5. Update thermal state
  newState = updateThermal(newState);
  
  // 6. Update public acceptance
  newState = updatePublicAcceptance(newState);
  
  // 7. Generate and apply random events
  const events = generateEvents(newState, rng);
  for (const event of events) {
    newState = applyEventEffects(newState, event);
    newState.events = [...newState.events, event];
  }
  
  // 8. Generate warning events
  const warnings = generateWarningEvents(newState);
  newState.events = [...newState.events, ...warnings];
  
  // 9. Update budget
  newState = updateBudget(newState);
  
  // 10. Record time series data
  newState = recordTimeSeries(newState);
  
  // 11. Update stats
  newState.stats = {
    ...newState.stats,
    weeksCompleted: newState.tick,
  };
  
  // 12. Check for failures
  newState = checkFailureConditions(newState);
  
  // 13. Check tutorial progression
  newState = checkTutorialProgression(newState);
  
  // 14. Update RNG state for next tick
  rng.next(); // Advance RNG
  newState.rngState = rng.getState();
  
  // Keep only recent events (last 50)
  if (newState.events.length > 50) {
    newState.events = newState.events.slice(-50);
  }
  
  return newState;
}

/**
 * Process a player action
 */
export function processAction(state: GameState, action: PlayerAction): GameState {
  // Check if action is unlocked
  if (!isActionUnlocked(state.tutorialStage, action.type)) {
    console.warn(`Action ${action.type} not unlocked at stage ${state.tutorialStage}`);
    return state;
  }
  
  let newState = { ...state };
  
  switch (action.type) {
    case 'build_datacenter': {
      const regionId = action.regionId as RegionId;
      const archetype = (action.params?.archetype as DataCenterArchetype) || 'modular';
      const coolingType = (action.params?.coolingType as CoolingType) || 'air';
      const spec = ARCHETYPES[archetype];
      
      // Check budget
      if (state.budget < spec.baseCost) {
        return state; // Can't afford
      }
      
      const region = state.regions[regionId];
      const permittingDelay = getPermittingDelay(archetype, region.publicAcceptance, region.permittingFriction);
      const totalBuildTime = spec.buildTimeWeeks + permittingDelay + Math.floor(region.permittingDelayWeeks);
      
      const dcId = `dc_${++dcCounter}`;
      const buildCompleteTick = state.tick + totalBuildTime;
      const gridConnectTick = buildCompleteTick + spec.gridConnectWeeks;
      
      // Create the data center
      const newDC = {
        id: dcId,
        regionId,
        archetype,
        computeCapacity: spec.computeCapacity,
        coolingCapacityMW: spec.coolingCapacityMW,
        coolingType,
        buildStartTick: state.tick,
        buildCompleteTick,
        gridConnectTick,
        isOperational: false,
        isGridConnected: false,
        currentUtilization: 0,
        thermalStress: 0,
      };
      
      // Add pending action for tracking
      const pendingAction = {
        id: `action_${++actionCounter}`,
        type: action.type,
        regionId,
        startTick: state.tick,
        completeTick: buildCompleteTick,
        params: { dataCenterId: dcId, gridConnectTick },
      };
      
      // Update region
      const updatedRegion = {
        ...region,
        dataCenterIds: [...region.dataCenterIds, dcId],
      };
      
      newState = {
        ...newState,
        budget: state.budget - spec.baseCost,
        dataCenters: { ...state.dataCenters, [dcId]: newDC },
        regions: { ...state.regions, [regionId]: updatedRegion },
        pendingActions: [...state.pendingActions, pendingAction],
        stats: { ...state.stats, dataCentersBuilt: state.stats.dataCentersBuilt + 1, totalBudgetSpent: state.stats.totalBudgetSpent + spec.baseCost },
      };
      
      // Add event
      newState.events = [...state.events, {
        id: `event_build_${dcId}`,
        tick: state.tick,
        type: 'milestone',
        message: `🏗️ Started building ${spec.name} data center in ${region.name} (ready in ${totalBuildTime} weeks)`,
        severity: 'info',
        regionId,
      }];
      
      break;
    }
    
    case 'upgrade_transmission': {
      const regionId = action.regionId as RegionId;
      const cost = UPGRADE_COSTS.transmissionUpgrade;
      
      if (state.budget < cost) return state;
      
      const pendingAction = {
        id: `action_${++actionCounter}`,
        type: action.type,
        regionId,
        startTick: state.tick,
        completeTick: state.tick + UPGRADE_DELAYS.transmissionUpgrade,
        params: { upgradeMW: 50 },
      };
      
      newState = {
        ...newState,
        budget: state.budget - cost,
        pendingActions: [...state.pendingActions, pendingAction],
        stats: { ...state.stats, totalBudgetSpent: state.stats.totalBudgetSpent + cost },
      };
      
      newState.events = [...state.events, {
        id: `event_trans_${actionCounter}`,
        tick: state.tick,
        type: 'milestone',
        message: `⚡ Started transmission upgrade in ${state.regions[regionId].name}`,
        severity: 'info',
        regionId,
      }];
      
      break;
    }
    
    case 'add_battery': {
      const regionId = action.regionId as RegionId;
      const cost = UPGRADE_COSTS.battery;
      
      if (state.budget < cost) return state;
      
      const pendingAction = {
        id: `action_${++actionCounter}`,
        type: action.type,
        regionId,
        startTick: state.tick,
        completeTick: state.tick + UPGRADE_DELAYS.battery,
        params: { capacityMWh: 50 },
      };
      
      newState = {
        ...newState,
        budget: state.budget - cost,
        pendingActions: [...state.pendingActions, pendingAction],
        stats: { ...state.stats, totalBudgetSpent: state.stats.totalBudgetSpent + cost },
      };
      
      break;
    }
    
    case 'sign_renewable_ppa': {
      const regionId = action.regionId as RegionId;
      const cost = UPGRADE_COSTS.renewablePPA;
      
      if (state.budget < cost) return state;
      
      const pendingAction = {
        id: `action_${++actionCounter}`,
        type: action.type,
        regionId,
        startTick: state.tick,
        completeTick: state.tick + UPGRADE_DELAYS.renewablePPA,
        params: { capacityMW: 20 },
      };
      
      newState = {
        ...newState,
        budget: state.budget - cost,
        pendingActions: [...state.pendingActions, pendingAction],
        stats: { ...state.stats, totalBudgetSpent: state.stats.totalBudgetSpent + cost },
      };
      
      newState.events = [...state.events, {
        id: `event_ppa_${actionCounter}`,
        tick: state.tick,
        type: 'milestone',
        message: `🌱 Signed renewable PPA for ${state.regions[regionId].name}`,
        severity: 'info',
        regionId,
      }];
      
      break;
    }
    
    case 'community_investment': {
      const regionId = action.regionId as RegionId;
      const cost = UPGRADE_COSTS.communityInvestment;
      
      if (state.budget < cost) return state;
      
      const pendingAction = {
        id: `action_${++actionCounter}`,
        type: action.type,
        regionId,
        startTick: state.tick,
        completeTick: state.tick + UPGRADE_DELAYS.communityInvestment,
        params: {},
      };
      
      newState = {
        ...newState,
        budget: state.budget - cost,
        pendingActions: [...state.pendingActions, pendingAction],
        stats: { ...state.stats, totalBudgetSpent: state.stats.totalBudgetSpent + cost },
      };
      
      break;
    }
    
    case 'upgrade_cooling': {
      const dcId = action.dataCenterId;
      const cost = UPGRADE_COSTS.coolingUpgrade;
      
      if (!dcId || state.budget < cost) return state;
      
      const pendingAction = {
        id: `action_${++actionCounter}`,
        type: action.type,
        dataCenterId: dcId,
        startTick: state.tick,
        completeTick: state.tick + UPGRADE_DELAYS.coolingUpgrade,
        params: {},
      };
      
      newState = {
        ...newState,
        budget: state.budget - cost,
        pendingActions: [...state.pendingActions, pendingAction],
        stats: { ...state.stats, totalBudgetSpent: state.stats.totalBudgetSpent + cost },
      };
      
      break;
    }
    
    case 'change_cooling_type': {
      const dcId = action.dataCenterId;
      const newCoolingType = action.params?.coolingType as CoolingType;
      
      if (!dcId || !newCoolingType) return state;
      
      const dc = state.dataCenters[dcId];
      if (!dc) return state;
      
      // Instant change but with cost
      const cost = newCoolingType === 'liquid' ? 50 : newCoolingType === 'evaporative' ? 20 : 0;
      if (state.budget < cost) return state;
      
      newState = {
        ...newState,
        budget: state.budget - cost,
        dataCenters: {
          ...state.dataCenters,
          [dcId]: { ...dc, coolingType: newCoolingType },
        },
        stats: { ...state.stats, totalBudgetSpent: state.stats.totalBudgetSpent + cost },
      };
      
      break;
    }
    
    default:
      break;
  }
  
  return newState;
}

/**
 * Start or restart the simulation
 */
export function startSimulation(state: GameState): GameState {
  return {
    ...state,
    isRunning: true,
    isPaused: false,
  };
}

/**
 * Pause the simulation
 */
export function pauseSimulation(state: GameState): GameState {
  return {
    ...state,
    isPaused: true,
  };
}

/**
 * Resume the simulation
 */
export function resumeSimulation(state: GameState): GameState {
  return {
    ...state,
    isPaused: false,
  };
}

// Re-export from submodules
export * from './model';
export * from './state';
export * from './archetypes';
export * from './regionData';
export * from './events';
export * from './dynamics';
export * from './scoring';
export * from './tutorial';
export * from './rng';
