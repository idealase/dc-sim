import React from 'react';
import type { GameState, TutorialStage } from '../../sim';
import { getCurrentStageConfig, getContextualCoachMessage } from '../../sim';

interface TutorialOverlayProps {
  state: GameState;
  onDismiss: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ state, onDismiss }) => {
  const config = getCurrentStageConfig(state.tutorialStage);
  const coachMessage = getContextualCoachMessage(state);

  if (state.tutorialCompleted || !config) {
    // Show coach message even after tutorial complete if there's a warning
    if (coachMessage) {
      return (
        <div className="coach-message">
          {coachMessage}
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Coach message (contextual warnings) */}
      {coachMessage && state.tick > 5 && (
        <div className="coach-message">
          {coachMessage}
        </div>
      )}

      {/* Tutorial card */}
      <div className={`tutorial-overlay ${state.stageJustAdvanced ? 'stage-advance-flash' : ''}`}>
        <div className="tutorial-header">
          <span className="tutorial-stage">Stage {config.stage} of 5</span>
          {state.tutorialStage !== 1 && (
            <button 
              className="btn-secondary btn-small"
              onClick={onDismiss}
            >
              Skip Tutorial
            </button>
          )}
        </div>
        
        <h3 className="tutorial-title">{config.title}</h3>
        
        <p className="tutorial-content">
          {config.description}
        </p>

        <div className="tutorial-objective">
          <div className="tutorial-objective-label">🎯 Objective</div>
          <div>{config.objective}</div>
        </div>

        <div style={{ 
          background: 'var(--warning-dim)', 
          padding: '8px 12px', 
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '0.85rem'
        }}>
          <strong>⚠️ Challenge:</strong> {config.crisisDescription}
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '4px'
          }}>
            <span>Tutorial Progress</span>
            <span>{((Number(config.stage) - 1) / 5 * 100).toFixed(0)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill info"
              style={{ width: `${(Number(config.stage) - 1) / 5 * 100}%` }}
            />
          </div>
        </div>

        <div className="tutorial-actions">
          <button 
            className="btn-secondary btn-small"
            onClick={() => {
              // Scroll to show me target
              const target = document.getElementById(config.showMeTarget || 'map-board');
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.boxShadow = '0 0 20px var(--accent-primary)';
                setTimeout(() => {
                  target.style.boxShadow = '';
                }, 2000);
              }
            }}
          >
            Show Me
          </button>
        </div>
      </div>
    </>
  );
};

// Stage advancement celebration
export const StageAdvanceModal: React.FC<{
  fromStage: TutorialStage;
  toStage: TutorialStage;
  onContinue: () => void;
}> = ({ fromStage, toStage, onContinue }) => {
  const newConfig = getCurrentStageConfig(toStage);
  
  return (
    <div className="modal-backdrop" onClick={onContinue}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '450px', textAlign: 'center' }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ marginBottom: '8px' }}>Stage {fromStage} Complete!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Great work! You've mastered the basics.
        </p>

        {toStage !== 'complete' && newConfig && (
          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '16px', 
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h4 style={{ marginBottom: '8px' }}>🔓 Unlocked: Stage {toStage}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {newConfig.title}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {newConfig.description}
            </p>
          </div>
        )}

        {toStage === 'complete' && (
          <div style={{ 
            background: 'var(--success-dim)', 
            padding: '16px', 
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h4>🏆 Tutorial Complete!</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              All controls are now unlocked. Build your data center empire!
            </p>
          </div>
        )}

        <button className="btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};
