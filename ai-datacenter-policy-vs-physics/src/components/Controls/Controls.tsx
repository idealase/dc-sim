import React, { useState } from 'react';
import type { GameState, RegionId, PlayerAction, DataCenterArchetype, CoolingType } from '../../sim';
import { ARCHETYPES, COOLING_SPECS, UPGRADE_COSTS, isActionUnlocked } from '../../sim';

interface ControlsProps {
  state: GameState;
  selectedRegion: RegionId | null;
  onAction: (action: PlayerAction) => void;
}

export const Controls: React.FC<ControlsProps> = ({ state, selectedRegion, onAction }) => {
  const [selectedArchetype, setSelectedArchetype] = useState<DataCenterArchetype>('modular');
  const [selectedCooling, setSelectedCooling] = useState<CoolingType>('air');

  const canAfford = (cost: number) => state.budget >= cost;
  const stage = state.tutorialStage;

  const handleBuildDC = () => {
    if (!selectedRegion) return;
    onAction({
      type: 'build_datacenter',
      regionId: selectedRegion,
      params: {
        archetype: selectedArchetype,
        coolingType: selectedCooling,
      },
    });
  };

  const handleUpgradeTransmission = () => {
    if (!selectedRegion) return;
    onAction({
      type: 'upgrade_transmission',
      regionId: selectedRegion,
    });
  };

  const handleAddBattery = () => {
    if (!selectedRegion) return;
    onAction({
      type: 'add_battery',
      regionId: selectedRegion,
    });
  };

  const handleSignPPA = () => {
    if (!selectedRegion) return;
    onAction({
      type: 'sign_renewable_ppa',
      regionId: selectedRegion,
    });
  };

  const handleCommunityInvestment = () => {
    if (!selectedRegion) return;
    onAction({
      type: 'community_investment',
      regionId: selectedRegion,
    });
  };

  const ActionButton: React.FC<{
    label: string;
    cost: number;
    onClick: () => void;
    disabled?: boolean;
    unlocked?: boolean;
  }> = ({ label, cost, onClick, disabled, unlocked = true }) => {
    if (!unlocked) {
      return (
        <div className="locked-indicator">
          {label} - Locked
        </div>
      );
    }

    return (
      <div className="control-action">
        <div className="control-action-info">
          <span className="control-action-name">{label}</span>
          <span className="control-action-cost">${cost}</span>
        </div>
        <button
          className="btn-primary btn-small"
          onClick={onClick}
          disabled={disabled || !canAfford(cost)}
        >
          {canAfford(cost) ? 'Build' : 'Need $'}
        </button>
      </div>
    );
  };

  return (
    <div className="card controls-panel">
      <div className="card-header">
        <h3 className="card-title">🎮 Controls</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
          ${state.budget.toFixed(0)}
        </span>
      </div>

      {!selectedRegion && (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px'
        }}>
          ← Select a region to build
        </div>
      )}

      {selectedRegion && (
        <>
          {/* Build Data Center */}
          {isActionUnlocked(stage, 'build_datacenter') && (
            <div className="control-group">
              <div className="control-group-title">🏗️ Build Data Center</div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type:</label>
                <select
                  value={selectedArchetype}
                  onChange={(e) => setSelectedArchetype(e.target.value as DataCenterArchetype)}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  {(Object.keys(ARCHETYPES) as DataCenterArchetype[]).map(arch => (
                    <option key={arch} value={arch}>
                      {ARCHETYPES[arch].name} - {ARCHETYPES[arch].computeCapacity} CU (${ARCHETYPES[arch].baseCost})
                    </option>
                  ))}
                </select>
              </div>

              {isActionUnlocked(stage, 'change_cooling_type') && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cooling:</label>
                  <select
                    value={selectedCooling}
                    onChange={(e) => setSelectedCooling(e.target.value as CoolingType)}
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    {(Object.keys(COOLING_SPECS) as CoolingType[]).map(cooling => (
                      <option key={cooling} value={cooling}>
                        {COOLING_SPECS[cooling].name}
                        {COOLING_SPECS[cooling].cost > 0 && ` (+$${COOLING_SPECS[cooling].cost})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)', 
                marginBottom: '8px',
                padding: '8px',
                background: 'var(--bg-secondary)',
                borderRadius: '4px'
              }}>
                <div>Capacity: {ARCHETYPES[selectedArchetype].computeCapacity} Compute Units</div>
                <div>Build time: ~{ARCHETYPES[selectedArchetype].buildTimeWeeks} weeks</div>
                <div>Grid connect: +{ARCHETYPES[selectedArchetype].gridConnectWeeks} weeks</div>
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={handleBuildDC}
                disabled={!canAfford(ARCHETYPES[selectedArchetype].baseCost)}
              >
                Build ${ARCHETYPES[selectedArchetype].baseCost}
              </button>
            </div>
          )}

          {/* Grid Upgrades */}
          {isActionUnlocked(stage, 'upgrade_transmission') && (
            <div className="control-group">
              <div className="control-group-title">⚡ Grid & Power</div>
              <div className="control-actions">
                <ActionButton
                  label="Upgrade Transmission (+50 MW)"
                  cost={UPGRADE_COSTS.transmissionUpgrade}
                  onClick={handleUpgradeTransmission}
                  unlocked={isActionUnlocked(stage, 'upgrade_transmission')}
                />
                <ActionButton
                  label="Add Battery (50 MWh)"
                  cost={UPGRADE_COSTS.battery}
                  onClick={handleAddBattery}
                  unlocked={isActionUnlocked(stage, 'add_battery')}
                />
              </div>
            </div>
          )}

          {/* Cooling Upgrades */}
          {isActionUnlocked(stage, 'upgrade_cooling') && (
            <div className="control-group">
              <div className="control-group-title">🌡️ Cooling</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Upgrade existing DC cooling capacity by 20%
              </div>
              {state.regions[selectedRegion]?.dataCenterIds.map(dcId => {
                const dc = state.dataCenters[dcId];
                if (!dc || !dc.isOperational) return null;
                return (
                  <div key={dcId} className="control-action">
                    <div className="control-action-info">
                      <span className="control-action-name">{dc.archetype} DC</span>
                      <span className="control-action-cost">
                        {dc.coolingCapacityMW.toFixed(0)} MW → {(dc.coolingCapacityMW * 1.2).toFixed(0)} MW
                      </span>
                    </div>
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => onAction({
                        type: 'upgrade_cooling',
                        dataCenterId: dcId,
                      })}
                      disabled={!canAfford(UPGRADE_COSTS.coolingUpgrade)}
                    >
                      ${UPGRADE_COSTS.coolingUpgrade}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sustainability */}
          {isActionUnlocked(stage, 'sign_renewable_ppa') && (
            <div className="control-group">
              <div className="control-group-title">🌱 Sustainability</div>
              <div className="control-actions">
                <ActionButton
                  label="Sign Renewable PPA (20 MW)"
                  cost={UPGRADE_COSTS.renewablePPA}
                  onClick={handleSignPPA}
                  unlocked={isActionUnlocked(stage, 'sign_renewable_ppa')}
                />
              </div>
            </div>
          )}

          {/* Community */}
          {isActionUnlocked(stage, 'community_investment') && (
            <div className="control-group">
              <div className="control-group-title">👥 Community</div>
              <div className="control-actions">
                <ActionButton
                  label="Community Investment (+10 acceptance)"
                  cost={UPGRADE_COSTS.communityInvestment}
                  onClick={handleCommunityInvestment}
                  unlocked={isActionUnlocked(stage, 'community_investment')}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Tutorial Hint */}
      {stage !== 'complete' && (
        <div style={{ 
          marginTop: '16px',
          padding: '8px',
          background: 'var(--info-dim)',
          borderRadius: '8px',
          fontSize: '0.75rem'
        }}>
          <strong>Stage {stage}:</strong> More controls unlock as you progress!
        </div>
      )}
    </div>
  );
};
