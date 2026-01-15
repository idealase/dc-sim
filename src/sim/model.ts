/**
 * Core data model types for the simulation
 */

// Time unit: 1 tick = 1 week
export const TICK_DURATION = 'week' as const;

// Cooling types available
export type CoolingType = 'air' | 'evaporative' | 'liquid';

// Data center archetypes
export type DataCenterArchetype = 'hyperscale' | 'modular' | 'retrofit' | 'edge';

// Action types the player can take
export type ActionType =
  | 'build_datacenter'
  | 'upgrade_cooling'
  | 'change_cooling_type'
  | 'sign_renewable_ppa'
  | 'add_battery'
  | 'upgrade_transmission'
  | 'community_investment'
  | 'shift_workload';

// Region identifier
export type RegionId = 'region_a' | 'region_b' | 'region_c' | 'region_d' | 'region_e' | 'region_f';

// Data center instance
export interface DataCenter {
  id: string;
  regionId: RegionId;
  archetype: DataCenterArchetype;
  computeCapacity: number; // Compute Units
  coolingCapacityMW: number;
  coolingType: CoolingType;
  buildStartTick: number;
  buildCompleteTick: number;
  gridConnectTick: number;
  isOperational: boolean;
  isGridConnected: boolean;
  currentUtilization: number; // 0-1
  thermalStress: number; // 0-1, heat accumulation
}

// Region state
export interface Region {
  id: RegionId;
  name: string;
  // Static attributes
  gridStrengthMW: number; // Available grid capacity
  renewablePotential: number; // 0-1
  waterStress: number; // 0-1
  permittingFriction: number; // 0-1
  baselineCarbonIntensity: number; // kgCO2e/MWh
  temperatureRisk: number; // 0-1, affects cooling during heatwaves
  // Dynamic state
  currentGridUsageMW: number;
  gridReserveMarginMW: number;
  publicAcceptance: number; // 0-100
  permittingDelayWeeks: number;
  hasHeatwave: boolean;
  hasBrownout: boolean;
  // Upgrades
  transmissionUpgradeMW: number;
  transmissionUpgradeCompleteTick: number | null;
  batteryCapacityMWh: number;
  renewablePPAMW: number;
  communityInvestment: number;
  // Data centers in this region
  dataCenterIds: string[];
}

// Pending action with delay
export interface PendingAction {
  id: string;
  type: ActionType;
  regionId?: RegionId;
  dataCenterId?: string;
  startTick: number;
  completeTick: number;
  params: Record<string, unknown>;
}

// Event that occurred
export interface GameEvent {
  id: string;
  tick: number;
  type: EventType;
  regionId?: RegionId;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  causalFactor?: string;
}

export type EventType =
  | 'demand_shock'
  | 'heatwave'
  | 'brownout'
  | 'thermal_trip'
  | 'regulatory_warning'
  | 'regulatory_shutdown'
  | 'public_backlash'
  | 'supply_chain_delay'
  | 'datacenter_online'
  | 'upgrade_complete'
  | 'milestone';

// Failure types
export type FailureType =
  | 'backlog_collapse'
  | 'grid_instability'
  | 'thermal_trip'
  | 'regulatory_shutdown'
  | 'permitting_freeze';

// Causal trace entry
export interface CausalEntry {
  tick: number;
  cause: string;
  effect: string;
  metric?: string;
  delta?: number;
}

// Tutorial stage
export type TutorialStage = 1 | 2 | 3 | 4 | 5 | 'complete';

// Player statistics for scoring
export interface RunStats {
  totalDemandServed: number;
  totalDemandMissed: number;
  totalCarbonEmissions: number;
  totalWaterUsed: number;
  totalBudgetSpent: number;
  peakBacklog: number;
  brownoutCount: number;
  thermalTripCount: number;
  dataCentersBuilt: number;
  weeksCompleted: number;
}

// Time series data point for charts
export interface TimeSeriesPoint {
  tick: number;
  demand: number;
  served: number;
  backlog: number;
  totalPowerMW: number;
  totalGridCapacityMW: number;
  avgCarbonIntensity: number;
  cumulativeEmissions: number;
}

// Archetype specifications
export interface ArchetypeSpec {
  name: string;
  computeCapacity: number;
  coolingCapacityMW: number;
  buildTimeWeeks: number;
  gridConnectWeeks: number;
  baseCost: number;
  powerPerComputeUnit: number; // MW per compute unit
  pue: number; // Power Usage Effectiveness
  minPermittingWeeks: number;
}

// Full game state
export interface GameState {
  // Core simulation
  tick: number;
  isRunning: boolean;
  isPaused: boolean;
  isFailed: boolean;
  failureType: FailureType | null;
  seed: number;
  rngState: number;

  // Tutorial
  tutorialStage: TutorialStage;
  tutorialCompleted: boolean;
  stageJustAdvanced: boolean;

  // Resources
  budget: number;
  
  // Demand
  aiDemand: number; // Current demand (AI Work Units / week)
  demandServed: number;
  backlog: number;
  backlogGraceTicksRemaining: number;

  // Entities
  regions: Record<RegionId, Region>;
  dataCenters: Record<string, DataCenter>;
  pendingActions: PendingAction[];

  // History
  events: GameEvent[];
  causalTrace: CausalEntry[];
  timeSeries: TimeSeriesPoint[];
  
  // Stats
  stats: RunStats;
  
  // Carbon tracking
  carbonCapBudget: number; // Total allowed emissions
  currentEmissions: number;
  carbonWarningIssued: boolean;
}

// Player action input
export interface PlayerAction {
  type: ActionType;
  regionId?: RegionId;
  dataCenterId?: string;
  params?: Record<string, unknown>;
}
