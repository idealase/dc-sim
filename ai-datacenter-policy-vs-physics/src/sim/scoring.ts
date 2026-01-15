/**
 * Scoring and run evaluation
 */

import type { GameState, FailureType } from './model';
import { CONFIG } from './state';

export interface RunScore {
  totalScore: number;
  grades: {
    efficiency: { score: number; grade: string; detail: string };
    sustainability: { score: number; grade: string; detail: string };
    reliability: { score: number; grade: string; detail: string };
    growth: { score: number; grade: string; detail: string };
  };
  achievements: string[];
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function calculateRunScore(state: GameState): RunScore {
  const stats = state.stats;
  
  // Efficiency: demand served vs total demand
  const totalDemand = stats.totalDemandServed + stats.totalDemandMissed;
  const efficiencyRatio = totalDemand > 0 ? stats.totalDemandServed / totalDemand : 0;
  const efficiencyScore = Math.round(efficiencyRatio * 100);
  
  // Sustainability: carbon emissions vs budget
  const carbonRatio = state.currentEmissions / state.carbonCapBudget;
  const sustainabilityScore = Math.round(Math.max(0, 100 - carbonRatio * 100));
  
  // Reliability: brownouts and thermal trips
  const maxIncidents = stats.weeksCompleted * 0.1; // Allow up to 10% incident rate
  const incidentRate = (stats.brownoutCount + stats.thermalTripCount) / Math.max(maxIncidents, 1);
  const reliabilityScore = Math.round(Math.max(0, 100 - incidentRate * 50));
  
  // Growth: data centers built and weeks survived
  const expectedDCs = Math.floor(stats.weeksCompleted / 20); // Expect ~1 DC per 20 weeks
  const growthRatio = expectedDCs > 0 ? Math.min(stats.dataCentersBuilt / expectedDCs, 1.5) : 1;
  const weekBonus = Math.min(stats.weeksCompleted / 52, 2) * 20; // Up to 40 points for 2+ years
  const growthScore = Math.round(Math.min(100, growthRatio * 40 + weekBonus));
  
  // Total weighted score
  const totalScore = Math.round(
    efficiencyScore * 0.3 +
    sustainabilityScore * 0.25 +
    reliabilityScore * 0.25 +
    growthScore * 0.2
  );
  
  // Achievements
  const achievements: string[] = [];
  if (stats.weeksCompleted >= 52) achievements.push('🎖️ One Year Operations');
  if (stats.weeksCompleted >= 104) achievements.push('🏆 Two Year Veteran');
  if (stats.brownoutCount === 0 && stats.weeksCompleted > 26) achievements.push('⚡ Perfect Grid');
  if (carbonRatio < 0.5 && stats.weeksCompleted > 26) achievements.push('🌱 Carbon Champion');
  if (stats.dataCentersBuilt >= 5) achievements.push('🏗️ Builder');
  if (efficiencyRatio > 0.95) achievements.push('📊 Efficiency Expert');
  if (stats.thermalTripCount === 0 && stats.weeksCompleted > 26) achievements.push('❄️ Cool Operator');
  
  return {
    totalScore,
    grades: {
      efficiency: {
        score: efficiencyScore,
        grade: gradeFromScore(efficiencyScore),
        detail: `${(efficiencyRatio * 100).toFixed(1)}% demand served`,
      },
      sustainability: {
        score: sustainabilityScore,
        grade: gradeFromScore(sustainabilityScore),
        detail: `${(carbonRatio * 100).toFixed(1)}% carbon budget used`,
      },
      reliability: {
        score: reliabilityScore,
        grade: gradeFromScore(reliabilityScore),
        detail: `${stats.brownoutCount} brownouts, ${stats.thermalTripCount} thermal trips`,
      },
      growth: {
        score: growthScore,
        grade: gradeFromScore(growthScore),
        detail: `${stats.dataCentersBuilt} DCs built in ${stats.weeksCompleted} weeks`,
      },
    },
    achievements,
  };
}

// Failure analysis - what went wrong and what could have been done
export interface FailureAnalysis {
  failureType: FailureType;
  title: string;
  description: string;
  rootCauses: string[];
  suggestions: string[];
}

export function analyzeFailure(state: GameState): FailureAnalysis | null {
  if (!state.isFailed || !state.failureType) return null;
  
  const causalChain = state.causalTrace.slice(-5).map(c => `${c.cause} → ${c.effect}`);
  
  switch (state.failureType) {
    case 'backlog_collapse':
      return {
        failureType: 'backlog_collapse',
        title: 'Service Level Collapse',
        description: 'Unserved demand accumulated beyond acceptable levels. Customers and regulators have lost confidence.',
        rootCauses: [
          'Demand growth outpaced capacity additions',
          'Build times were too long for demand trajectory',
          ...causalChain,
        ],
        suggestions: [
          'Build modular data centers first for quick capacity',
          'Start building before you need the capacity',
          'Use multiple regions to parallelize construction',
          'Monitor demand growth rate and plan ahead',
        ],
      };
      
    case 'grid_instability':
      return {
        failureType: 'grid_instability',
        title: 'Grid Collapse',
        description: 'Repeated brownouts have destabilized the regional power grid. Operations suspended.',
        rootCauses: [
          'Facility power exceeded grid capacity',
          'No battery buffer for peak loads',
          'Transmission upgrades not completed in time',
          ...causalChain,
        ],
        suggestions: [
          'Add battery storage to buffer peak demand',
          'Start transmission upgrades early (they take time)',
          'Choose regions with stronger grids',
          'Consider renewable PPAs which can add capacity',
        ],
      };
      
    case 'thermal_trip':
      return {
        failureType: 'thermal_trip',
        title: 'Thermal Emergency',
        description: 'Cooling systems failed repeatedly. Equipment damage has forced shutdown.',
        rootCauses: [
          'Cooling capacity insufficient for IT load',
          'Heatwave event overwhelmed air cooling',
          'High utilization without cooling upgrades',
          ...causalChain,
        ],
        suggestions: [
          'Upgrade to liquid cooling in high-risk regions',
          'Keep utilization below 80% during heatwaves',
          'Proactively upgrade cooling before crises',
          'Choose regions with lower temperature risk',
        ],
      };
      
    case 'regulatory_shutdown':
      return {
        failureType: 'regulatory_shutdown',
        title: 'Regulatory Shutdown',
        description: 'Carbon emissions exceeded regulatory caps. Operations suspended pending review.',
        rootCauses: [
          'High carbon intensity energy mix',
          'Insufficient renewable energy procurement',
          'Rapid capacity growth without decarbonization',
          ...causalChain,
        ],
        suggestions: [
          'Sign renewable PPAs early',
          'Choose regions with low baseline carbon intensity',
          'Balance growth with sustainability investments',
          'Use batteries to reduce peak grid draw',
        ],
      };
      
    case 'permitting_freeze':
      return {
        failureType: 'permitting_freeze',
        title: 'Community Opposition',
        description: 'Public acceptance collapsed. All permits revoked, no new construction allowed.',
        rootCauses: [
          'Repeated incidents (brownouts, water issues) angered communities',
          'No investment in community benefits',
          'Expanded too fast without building trust',
          ...causalChain,
        ],
        suggestions: [
          'Invest in community benefits proactively',
          'Choose cooling types that use less water',
          'Prevent brownouts to maintain trust',
          'Build slowly and maintain good relations',
        ],
      };
  }
  
  return null;
}

// Check for failure conditions
export function checkFailureConditions(state: GameState): GameState {
  if (state.isFailed) return state;
  
  // Backlog failure
  if (state.backlog > CONFIG.backlogFailureThreshold) {
    if (state.backlogGraceTicksRemaining <= 0) {
      return {
        ...state,
        isFailed: true,
        failureType: 'backlog_collapse',
        isRunning: false,
      };
    }
    return {
      ...state,
      backlogGraceTicksRemaining: state.backlogGraceTicksRemaining - 1,
    };
  } else {
    // Reset grace period if backlog is under control
    if (state.backlogGraceTicksRemaining < CONFIG.backlogGraceTicks) {
      return {
        ...state,
        backlogGraceTicksRemaining: Math.min(
          CONFIG.backlogGraceTicks,
          state.backlogGraceTicksRemaining + 0.5
        ),
      };
    }
  }
  
  // Grid instability failure
  const brownoutRegions = Object.values(state.regions).filter(r => r.hasBrownout);
  if (brownoutRegions.length > 0 && state.stats.brownoutCount > 10) {
    return {
      ...state,
      isFailed: true,
      failureType: 'grid_instability',
      isRunning: false,
    };
  }
  
  // Thermal trip failure
  const severelyOverheatedDCs = Object.values(state.dataCenters).filter(
    dc => dc.thermalStress >= CONFIG.thermalStressFailure
  );
  if (severelyOverheatedDCs.length > 0 && state.stats.thermalTripCount > 5) {
    return {
      ...state,
      isFailed: true,
      failureType: 'thermal_trip',
      isRunning: false,
    };
  }
  
  // Carbon regulatory shutdown
  if (state.currentEmissions > state.carbonCapBudget) {
    return {
      ...state,
      isFailed: true,
      failureType: 'regulatory_shutdown',
      isRunning: false,
    };
  }
  
  // Permitting freeze from low acceptance
  const frozenRegions = Object.values(state.regions).filter(
    r => r.publicAcceptance < CONFIG.acceptanceFailureThreshold && r.dataCenterIds.length > 0
  );
  if (frozenRegions.length >= 2) {
    return {
      ...state,
      isFailed: true,
      failureType: 'permitting_freeze',
      isRunning: false,
    };
  }
  
  return state;
}
