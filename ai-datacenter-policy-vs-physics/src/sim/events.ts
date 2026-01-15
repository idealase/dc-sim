/**
 * Event generation and processing
 */

import type { GameState, GameEvent, EventType, RegionId } from './model';
import { RNG } from './rng';

let eventCounter = 0;

function createEvent(
  tick: number,
  type: EventType,
  message: string,
  severity: 'info' | 'warning' | 'critical',
  regionId?: RegionId,
  causalFactor?: string
): GameEvent {
  return {
    id: `event_${++eventCounter}`,
    tick,
    type,
    regionId,
    message,
    severity,
    causalFactor,
  };
}

// Generate random events based on game state
export function generateEvents(state: GameState, rng: RNG): GameEvent[] {
  const events: GameEvent[] = [];
  const tick = state.tick;
  
  // Demand shock events (product launches, AI breakthroughs)
  if (tick > 10 && rng.chance(0.08)) {
    const shockType = rng.pick([
      'Major AI product launch announced',
      'New AI capability breakthrough',
      'Government AI initiative launched',
      'Enterprise AI adoption surge',
    ]);
    events.push(createEvent(
      tick,
      'demand_shock',
      `📈 Demand Shock: ${shockType}`,
      'warning',
      undefined,
      'market_dynamics'
    ));
  }
  
  // Regional events
  for (const region of Object.values(state.regions)) {
    // Heatwave events - more likely in high temperature risk regions
    if (!region.hasHeatwave && rng.chance(0.03 * region.temperatureRisk)) {
      events.push(createEvent(
        tick,
        'heatwave',
        `🌡️ Heatwave in ${region.name} - cooling systems stressed`,
        'warning',
        region.id,
        'weather'
      ));
    }
    
    // End heatwave
    if (region.hasHeatwave && rng.chance(0.3)) {
      events.push(createEvent(
        tick,
        'heatwave',
        `✓ Heatwave ended in ${region.name}`,
        'info',
        region.id
      ));
    }
    
    // Supply chain delays (affects build times)
    if (state.pendingActions.some(a => a.regionId === region.id) && rng.chance(0.02)) {
      events.push(createEvent(
        tick,
        'supply_chain_delay',
        `⚠️ Supply chain delay affecting ${region.name}`,
        'warning',
        region.id,
        'supply_chain'
      ));
    }
    
    // Public backlash from various causes
    const backlashTriggers: string[] = [];
    if (region.hasBrownout) backlashTriggers.push('power outages');
    if (region.waterStress > 0.7 && region.dataCenterIds.length > 0) backlashTriggers.push('water usage concerns');
    if (region.currentGridUsageMW > region.gridStrengthMW * 0.9) backlashTriggers.push('grid strain');
    
    if (backlashTriggers.length > 0 && rng.chance(0.1 * backlashTriggers.length)) {
      events.push(createEvent(
        tick,
        'public_backlash',
        `😠 Public backlash in ${region.name} due to ${backlashTriggers[0]}`,
        'warning',
        region.id,
        backlashTriggers[0]
      ));
    }
  }
  
  // Milestone events
  if (tick === 52) {
    events.push(createEvent(tick, 'milestone', '🎉 First year complete!', 'info'));
  } else if (tick === 104) {
    events.push(createEvent(tick, 'milestone', '🎉 Two years of operations!', 'info'));
  }
  
  return events;
}

// Apply event effects to state
export function applyEventEffects(state: GameState, event: GameEvent): GameState {
  const newState = { ...state };
  
  switch (event.type) {
    case 'demand_shock': {
      // Increase demand by 20-40%
      newState.aiDemand = state.aiDemand * 1.3;
      newState.causalTrace = [...state.causalTrace, {
        tick: state.tick,
        cause: 'Demand shock event',
        effect: 'AI demand increased 30%',
        metric: 'aiDemand',
        delta: state.aiDemand * 0.3,
      }];
      break;
    }
    
    case 'heatwave': {
      if (event.regionId) {
        const region = { ...newState.regions[event.regionId] };
        if (event.message.includes('ended')) {
          region.hasHeatwave = false;
        } else {
          region.hasHeatwave = true;
        }
        newState.regions = { ...newState.regions, [event.regionId]: region };
      }
      break;
    }
    
    case 'public_backlash': {
      if (event.regionId) {
        const region = { ...newState.regions[event.regionId] };
        const decrease = 5 + Math.random() * 10;
        region.publicAcceptance = Math.max(0, region.publicAcceptance - decrease);
        region.permittingDelayWeeks = Math.min(20, region.permittingDelayWeeks + 2);
        newState.regions = { ...newState.regions, [event.regionId]: region };
        
        newState.causalTrace = [...state.causalTrace, {
          tick: state.tick,
          cause: `Public backlash in ${region.name}`,
          effect: `Public acceptance -${decrease.toFixed(0)}%, permitting delay +2 weeks`,
          metric: 'publicAcceptance',
          delta: -decrease,
        }];
      }
      break;
    }
    
    case 'supply_chain_delay': {
      // Extend pending builds by 2-4 weeks
      if (event.regionId) {
        newState.pendingActions = state.pendingActions.map(action => {
          if (action.regionId === event.regionId && action.type === 'build_datacenter') {
            return { ...action, completeTick: action.completeTick + 3 };
          }
          return action;
        });
      }
      break;
    }
    
    default:
      break;
  }
  
  return newState;
}

// Generate warning events based on state
export function generateWarningEvents(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const tick = state.tick;
  
  // Backlog warning
  if (state.backlog > 200 && state.backlog < 400) {
    events.push(createEvent(
      tick,
      'regulatory_warning',
      `⚠️ SLA Warning: Backlog at ${state.backlog.toFixed(0)} units`,
      'warning',
      undefined,
      'capacity_shortage'
    ));
  }
  
  // Carbon warning
  if (!state.carbonWarningIssued && state.currentEmissions > state.carbonCapBudget * 0.8) {
    events.push(createEvent(
      tick,
      'regulatory_warning',
      `⚠️ Carbon Warning: 80% of carbon budget consumed`,
      'critical',
      undefined,
      'emissions'
    ));
  }
  
  // Grid warnings per region
  for (const region of Object.values(state.regions)) {
    const effectiveCapacity = region.gridStrengthMW + 
      (region.transmissionUpgradeCompleteTick !== null && tick >= region.transmissionUpgradeCompleteTick 
        ? region.transmissionUpgradeMW : 0);
    const reserveMargin = effectiveCapacity - region.currentGridUsageMW;
    
    if (reserveMargin < 20 && reserveMargin > 0) {
      events.push(createEvent(
        tick,
        'regulatory_warning',
        `⚡ Grid Warning: ${region.name} reserve margin low (${reserveMargin.toFixed(0)} MW)`,
        'warning',
        region.id,
        'grid_strain'
      ));
    }
  }
  
  return events;
}
