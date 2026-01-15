import React from 'react';
import type { GameState, RegionId, Region } from '../../sim';
import { REGION_DESCRIPTIONS } from '../../sim';

interface MapBoardProps {
  state: GameState;
  selectedRegion: RegionId | null;
  onSelectRegion: (regionId: RegionId) => void;
}

export const MapBoard: React.FC<MapBoardProps> = ({ state, selectedRegion, onSelectRegion }) => {
  const unlockedRegionCount = state.tutorialStage === 'complete' || state.tutorialStage >= 5 ? 6 : 1;
  const regionIds = Object.keys(state.regions) as RegionId[];

  const getRegionStatusColor = (region: Region): string => {
    if (region.hasBrownout) return 'var(--danger)';
    if (region.hasHeatwave) return 'var(--warning)';
    if (region.publicAcceptance < 30) return 'var(--danger)';
    if (region.gridReserveMarginMW < 20) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <div className="card" id="map-board">
      <div className="card-header">
        <h3 className="card-title">🗺️ Regions</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {unlockedRegionCount === 1 ? '1 region unlocked' : `${unlockedRegionCount} regions unlocked`}
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
        gap: '12px' 
      }}>
        {regionIds.map((regionId, index) => {
          const region = state.regions[regionId];
          const isLocked = index >= unlockedRegionCount;
          const isSelected = selectedRegion === regionId;
          const dcCount = region.dataCenterIds.length;
          const operationalDCs = region.dataCenterIds
            .map(id => state.dataCenters[id])
            .filter(dc => dc?.isOperational && dc?.isGridConnected).length;
          const effectiveGridCapacity = region.gridStrengthMW + 
            (region.transmissionUpgradeCompleteTick !== null && state.tick >= region.transmissionUpgradeCompleteTick
              ? region.transmissionUpgradeMW : 0);

          return (
            <div
              key={regionId}
              className={`region-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => !isLocked && onSelectRegion(regionId)}
              style={{
                borderLeftColor: !isLocked ? getRegionStatusColor(region) : undefined,
                borderLeftWidth: '3px',
              }}
            >
              <div className="region-name">
                {isLocked ? '🔒 ' : ''}{region.name}
              </div>
              
              {!isLocked && (
                <>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-muted)', 
                    marginBottom: '8px' 
                  }}>
                    {REGION_DESCRIPTIONS[regionId]}
                  </div>
                  
                  <div className="region-stats">
                    <span>⚡ {effectiveGridCapacity.toFixed(0)} MW</span>
                    <span>🌡️ {(region.temperatureRisk * 100).toFixed(0)}% risk</span>
                    <span>💧 {(region.waterStress * 100).toFixed(0)}% stress</span>
                    <span>🌱 {region.baselineCarbonIntensity} kg/MWh</span>
                    <span>👥 {region.publicAcceptance.toFixed(0)}% accept</span>
                    <span>🏗️ {operationalDCs}/{dcCount} DCs</span>
                  </div>

                  {/* Status indicators */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    marginTop: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {region.hasBrownout && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'var(--danger-dim)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        ⚡ Brownout
                      </span>
                    )}
                    {region.hasHeatwave && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'var(--warning-dim)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        🌡️ Heatwave
                      </span>
                    )}
                    {region.batteryCapacityMWh > 0 && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'var(--info-dim)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        🔋 {region.batteryCapacityMWh} MWh
                      </span>
                    )}
                    {region.renewablePPAMW > 0 && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'var(--success-dim)', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        🌱 {region.renewablePPAMW} MW PPA
                      </span>
                    )}
                  </div>

                  {/* Data centers in this region */}
                  {dcCount > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Data Centers:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {region.dataCenterIds.map(dcId => {
                          const dc = state.dataCenters[dcId];
                          if (!dc) return null;
                          
                          const statusEmoji = dc.isGridConnected 
                            ? (dc.thermalStress > 0.7 ? '🌡️' : '✅')
                            : dc.isOperational 
                              ? '🔌' 
                              : '🏗️';
                          
                          return (
                            <div 
                              key={dcId}
                              style={{
                                fontSize: '0.65rem',
                                padding: '2px 4px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '2px',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>{statusEmoji} {dc.archetype}</span>
                              <span>{dc.computeCapacity} CU</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {isLocked && (
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--text-muted)', 
                  marginTop: '4px' 
                }}>
                  Unlock at Stage 5
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending builds */}
      {state.pendingActions.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            🔨 In Progress
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {state.pendingActions.map(action => {
              const weeksRemaining = action.completeTick - state.tick;
              const region = action.regionId ? state.regions[action.regionId] : null;
              
              return (
                <div 
                  key={action.id}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>
                    {action.type.replace(/_/g, ' ')}
                    {region && ` in ${region.name}`}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {weeksRemaining > 0 ? `${weeksRemaining}w` : 'Done'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
