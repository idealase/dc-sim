import React from 'react';
import type { GameState, RegionId } from '../../sim';
import { DemandChart, PowerChart, CarbonChart } from '../Charts';

interface DashboardProps {
  state: GameState;
}

export const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const totalCapacity = Object.values(state.dataCenters)
    .filter(dc => dc.isOperational && dc.isGridConnected)
    .reduce((sum, dc) => sum + dc.computeCapacity, 0);

  const totalPower = Object.values(state.regions)
    .reduce((sum, r) => sum + r.currentGridUsageMW, 0);

  const totalGridCapacity = Object.values(state.regions)
    .reduce((sum, r) => {
      const upgraded = r.transmissionUpgradeCompleteTick !== null && 
                       state.tick >= r.transmissionUpgradeCompleteTick
                       ? r.transmissionUpgradeMW : 0;
      return sum + r.gridStrengthMW + upgraded;
    }, 0);

  const gridMargin = totalGridCapacity - totalPower;
  const gridMarginPct = totalGridCapacity > 0 ? (gridMargin / totalGridCapacity) * 100 : 100;

  const avgThermalStress = Object.values(state.dataCenters)
    .filter(dc => dc.isOperational)
    .reduce((sum, dc, _, arr) => sum + dc.thermalStress / arr.length, 0);

  const carbonPct = (state.currentEmissions / state.carbonCapBudget) * 100;

  const getStatusClass = (value: number, warningThreshold: number, dangerThreshold: number, invert = false) => {
    if (invert) {
      if (value >= dangerThreshold) return 'danger';
      if (value >= warningThreshold) return 'warning';
      return 'success';
    }
    if (value <= dangerThreshold) return 'danger';
    if (value <= warningThreshold) return 'warning';
    return 'success';
  };

  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <div className="card-header">
        <h3 className="card-title">📊 Dashboard</h3>
      </div>
      
      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div className="indicator">
          <span className="indicator-label">Demand</span>
          <span className={`indicator-value ${state.backlog > 200 ? 'danger' : 'info'}`}>
            {state.aiDemand.toFixed(0)}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Capacity</span>
          <span className={`indicator-value ${totalCapacity < state.aiDemand ? 'warning' : 'success'}`}>
            {totalCapacity.toFixed(0)}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Backlog</span>
          <span className={`indicator-value ${getStatusClass(state.backlog, 100, 300, true)}`}>
            {state.backlog.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Gauges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div className="gauge-container">
          <div className="gauge-header">
            <span className="gauge-label">⚡ Grid Reserve</span>
            <span className={`gauge-value ${getStatusClass(gridMarginPct, 20, 10)}`}>
              {gridMargin.toFixed(0)} MW ({gridMarginPct.toFixed(0)}%)
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${getStatusClass(gridMarginPct, 20, 10)}`}
              style={{ width: `${Math.max(0, Math.min(100, gridMarginPct))}%` }}
            />
          </div>
        </div>

        <div className="gauge-container">
          <div className="gauge-header">
            <span className="gauge-label">🌡️ Thermal Headroom</span>
            <span className={`gauge-value ${getStatusClass(100 - avgThermalStress * 100, 30, 10)}`}>
              {((1 - avgThermalStress) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${getStatusClass(100 - avgThermalStress * 100, 30, 10)}`}
              style={{ width: `${Math.max(0, (1 - avgThermalStress) * 100)}%` }}
            />
          </div>
        </div>

        <div className="gauge-container">
          <div className="gauge-header">
            <span className="gauge-label">🌱 Carbon Budget Used</span>
            <span className={`gauge-value ${getStatusClass(100 - carbonPct, 20, 10)}`}>
              {carbonPct.toFixed(1)}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${carbonPct > 80 ? 'danger' : carbonPct > 60 ? 'warning' : 'success'}`}
              style={{ width: `${Math.min(100, carbonPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
            Demand vs Served
          </h4>
          <DemandChart data={state.timeSeries.slice(-52)} width={340} height={150} />
        </div>
        
        <div>
          <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
            Power vs Grid Capacity
          </h4>
          <PowerChart data={state.timeSeries.slice(-52)} width={340} height={150} />
        </div>

        <div>
          <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
            Carbon Emissions
          </h4>
          <CarbonChart 
            data={state.timeSeries.slice(-52)} 
            carbonBudget={state.carbonCapBudget}
            width={340} 
            height={130} 
          />
        </div>
      </div>

      {/* Region Status */}
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
          Region Status
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(Object.keys(state.regions) as RegionId[]).slice(0, state.tutorialStage === 'complete' || state.tutorialStage >= 5 ? 6 : 1).map(regionId => {
            const region = state.regions[regionId];
            const hasIssue = region.hasBrownout || region.hasHeatwave || region.publicAcceptance < 40;
            return (
              <div 
                key={regionId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: hasIssue ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}
              >
                <span>{region.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {region.hasBrownout && '⚡'}
                  {region.hasHeatwave && '🌡️'}
                  {region.publicAcceptance < 40 && '😠'}
                  {!hasIssue && '✓'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
