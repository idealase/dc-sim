/**
 * Tutorial system - progressive unlocking of controls
 */

import type { GameState, TutorialStage, ActionType } from './model';

export interface TutorialStageConfig {
  stage: TutorialStage;
  title: string;
  description: string;
  objective: string;
  unlockedActions: ActionType[];
  unlockedRegions: number; // How many regions are available
  crisisDescription: string;
  coachMessage: string;
  completionCondition: (state: GameState) => boolean;
  showMeTarget?: string; // CSS selector or element identifier to highlight
}

export const TUTORIAL_STAGES: TutorialStageConfig[] = [
  {
    stage: 1,
    title: 'Meeting Demand',
    description: 'Welcome to AI Data Center operations! Your first task is to build compute capacity to meet growing AI demand.',
    objective: 'Build a modular data center to start serving AI workloads.',
    unlockedActions: ['build_datacenter'],
    unlockedRegions: 1,
    crisisDescription: 'AI demand is growing rapidly. Without capacity, backlog will accumulate.',
    coachMessage: '📊 Watch the Demand vs Served chart. When demand exceeds capacity, work piles up in the backlog. Build a data center to increase capacity!',
    completionCondition: (state) => {
      const operationalDCs = Object.values(state.dataCenters).filter(dc => dc.isOperational && dc.isGridConnected);
      return operationalDCs.length >= 1 && state.demandServed > 0;
    },
    showMeTarget: 'map-board',
  },
  {
    stage: 2,
    title: 'Grid Constraints',
    description: 'Data centers consume massive amounts of electricity. Grid capacity is limited!',
    objective: 'Upgrade transmission capacity or add battery storage to prevent brownouts.',
    unlockedActions: ['build_datacenter', 'upgrade_transmission', 'add_battery'],
    unlockedRegions: 1,
    crisisDescription: 'Your data centers are straining the local power grid. Reserve margins are dropping dangerously low.',
    coachMessage: '⚡ The grid has limited capacity! When your facility power exceeds grid capacity, brownouts occur. Upgrade transmission lines or add batteries to buffer peak demand.',
    completionCondition: (state) => {
      const region = Object.values(state.regions)[0];
      return region.batteryCapacityMWh > 0 || 
             (region.transmissionUpgradeCompleteTick !== null && state.tick >= region.transmissionUpgradeCompleteTick);
    },
    showMeTarget: 'power-chart',
  },
  {
    stage: 3,
    title: 'Cooling & Thermal Management',
    description: 'Servers generate tremendous heat. Cooling systems must keep up or equipment will throttle.',
    objective: 'Upgrade cooling or change cooling type to handle thermal stress.',
    unlockedActions: ['build_datacenter', 'upgrade_transmission', 'add_battery', 'upgrade_cooling', 'change_cooling_type'],
    unlockedRegions: 1,
    crisisDescription: 'A heatwave is stressing your cooling systems! Thermal limits are being reached.',
    coachMessage: '🌡️ Heat is your enemy! Air cooling struggles during heatwaves. Consider upgrading to liquid cooling for better efficiency, or increase cooling capacity.',
    completionCondition: (state) => {
      const hasUpgradedCooling = Object.values(state.dataCenters).some(
        dc => dc.coolingType !== 'air' || dc.coolingCapacityMW > 30
      );
      return hasUpgradedCooling;
    },
    showMeTarget: 'thermal-indicator',
  },
  {
    stage: 4,
    title: 'Carbon & Policy',
    description: 'Regulators are watching your carbon emissions. Exceed the cap and face shutdown.',
    objective: 'Sign renewable PPAs to reduce your carbon intensity.',
    unlockedActions: ['build_datacenter', 'upgrade_transmission', 'add_battery', 'upgrade_cooling', 'change_cooling_type', 'sign_renewable_ppa'],
    unlockedRegions: 1,
    crisisDescription: 'Your carbon emissions are approaching regulatory limits. Action needed!',
    coachMessage: '🌱 Carbon cap regulations are strict! Sign Power Purchase Agreements (PPAs) with renewable energy providers to reduce your carbon intensity and stay compliant.',
    completionCondition: (state) => {
      const hasRenewable = Object.values(state.regions).some(r => r.renewablePPAMW > 0);
      return hasRenewable;
    },
    showMeTarget: 'carbon-chart',
  },
  {
    stage: 5,
    title: 'Multi-Region Expansion',
    description: 'Time to expand! But new regions have different challenges and communities have concerns.',
    objective: 'Build in a second region and manage public acceptance.',
    unlockedActions: ['build_datacenter', 'upgrade_transmission', 'add_battery', 'upgrade_cooling', 'change_cooling_type', 'sign_renewable_ppa', 'community_investment', 'shift_workload'],
    unlockedRegions: 6,
    crisisDescription: 'Public backlash in new regions is causing permitting delays. Community engagement needed!',
    coachMessage: '🏘️ Communities are concerned about noise, water usage, and jobs. Invest in community benefits to improve public acceptance and speed up permitting.',
    completionCondition: (state) => {
      const regionsWithDCs = new Set(
        Object.values(state.dataCenters).map(dc => dc.regionId)
      );
      return regionsWithDCs.size >= 2;
    },
    showMeTarget: 'region-selector',
  },
];

// Get current tutorial stage config
export function getCurrentStageConfig(stage: TutorialStage): TutorialStageConfig | null {
  if (stage === 'complete') return null;
  return TUTORIAL_STAGES.find(s => s.stage === stage) ?? null;
}

// Check if an action is unlocked for current tutorial stage
export function isActionUnlocked(stage: TutorialStage, action: ActionType): boolean {
  if (stage === 'complete') return true;
  const config = getCurrentStageConfig(stage);
  return config?.unlockedActions.includes(action) ?? false;
}

// Check if tutorial stage should advance
export function checkTutorialProgression(state: GameState): GameState {
  if (state.tutorialStage === 'complete') return state;
  
  const config = getCurrentStageConfig(state.tutorialStage);
  if (!config) return state;
  
  if (config.completionCondition(state)) {
    const nextStage = state.tutorialStage < 5 ? (state.tutorialStage + 1) as TutorialStage : 'complete';
    
    return {
      ...state,
      tutorialStage: nextStage,
      tutorialCompleted: nextStage === 'complete',
      stageJustAdvanced: true,
    };
  }
  
  return state;
}

// Get coach message for current situation
export function getContextualCoachMessage(state: GameState): string | null {
  // Priority warnings
  if (state.backlog > 300) {
    return '🚨 Backlog critical! Build more capacity immediately or you will fail.';
  }
  
  const regions = Object.values(state.regions);
  const lowGridRegion = regions.find(r => r.gridReserveMarginMW < 10);
  if (lowGridRegion) {
    return `⚡ Grid reserves dangerously low in ${lowGridRegion.name}! Add batteries or upgrade transmission.`;
  }
  
  const thermalStressedDC = Object.values(state.dataCenters).find(dc => dc.thermalStress > 0.7);
  if (thermalStressedDC) {
    return '🌡️ Data center overheating! Upgrade cooling or reduce utilization.';
  }
  
  if (state.currentEmissions > state.carbonCapBudget * 0.9) {
    return '🌱 Carbon cap nearly exceeded! Sign renewable PPAs urgently.';
  }
  
  const lowAcceptanceRegion = regions.find(r => r.publicAcceptance < 30 && r.dataCenterIds.length > 0);
  if (lowAcceptanceRegion) {
    return `😠 Public opposition rising in ${lowAcceptanceRegion.name}! Invest in community benefits.`;
  }
  
  // Stage-specific guidance
  const config = getCurrentStageConfig(state.tutorialStage);
  if (config && state.tick < 20) {
    return config.coachMessage;
  }
  
  return null;
}

// Save/load tutorial progress
const TUTORIAL_STORAGE_KEY = 'dc-sim-tutorial-progress';

export function saveTutorialProgress(stage: TutorialStage): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ stage }));
  } catch {
    // localStorage might not be available
  }
}

export function loadTutorialProgress(): TutorialStage {
  try {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data.stage ?? 1;
    }
  } catch {
    // localStorage might not be available
  }
  return 1;
}
