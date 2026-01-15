import React, { useState } from 'react';
import type { GameState, TutorialStage } from '../../sim';
import { getCurrentStageConfig, getContextualCoachMessage } from '../../sim';

interface TutorialOverlayProps {
  state: GameState;
  onDismiss: () => void;
}

// Get specific step-by-step instructions for each stage
function getStepByStepGuide(stage: TutorialStage, state: GameState): string[] {
  const dcCount = Object.keys(state.dataCenters).length;
  const operationalCount = Object.values(state.dataCenters).filter(dc => dc.isOperational && dc.isGridConnected).length;
  
  switch (stage) {
    case 1:
      if (dcCount === 0) {
        return [
          "1. Click on a GREEN region on the map (e.g., Arizona or Texas)",
          "2. Select 'Edge' (fastest to build) or 'Modular' data center type",
          "3. Choose a cooling method (Air is cheapest)",
          "4. Click 'Begin Construction'"
        ];
      } else if (operationalCount === 0) {
        return [
          "✓ Construction started! Now wait for it to complete.",
          "Watch the 'Pending Actions' section in the top-right panel.",
          "Your data center will finish building, then connect to grid.",
          "Tip: You can start building more DCs while waiting!"
        ];
      }
      return ["✓ You have operational capacity! Keep building to stay ahead of demand."];
    case 2:
      return [
        "1. Look at the Dashboard charts - watch the demand line",
        "2. Check your 'Demand Served' vs 'AI Demand' numbers",
        "3. Build more data centers to keep capacity above demand",
        "4. Try different regions - each has different power availability"
      ];
    case 3:
      return [
        "1. Notice each region has a 'Grid Reserve' indicator",
        "2. Regions with low reserves (orange/red) are risky",
        "3. Try building in regions with more green grid reserve",
        "4. Watch the Power Consumption chart in the dashboard"
      ];
    case 4:
      return [
        "1. Watch the Carbon Budget meter at the top",
        "2. Try 'Liquid Cooling' for better efficiency (lower emissions)",
        "3. Build in regions with cleaner power (lower carbon intensity)",
        "4. Balance growth speed against sustainability"
      ];
    case 5:
      return [
        "1. Watch for crisis events in the Event Ticker",
        "2. Heatwaves reduce cooling effectiveness",
        "3. Grid failures can take data centers offline",
        "4. Diversify across regions to reduce risk"
      ];
    default:
      return [];
  }
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ state, onDismiss }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const config = getCurrentStageConfig(state.tutorialStage);
  const coachMessage = getContextualCoachMessage(state);
  const steps = getStepByStepGuide(state.tutorialStage, state);

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

  // Minimized view - just a small badge
  if (isMinimized) {
    return (
      <>
        {/* Coach message (contextual warnings) */}
        {coachMessage && state.tick > 5 && (
          <div className="coach-message">
            {coachMessage}
          </div>
        )}
        
        {/* Minimized tutorial badge */}
        <div 
          className="tutorial-minimized"
          onClick={() => setIsMinimized(false)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: 'var(--accent-primary)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          <span>📖</span>
          <span>Stage {config.stage}: {config.title}</span>
          <span style={{ opacity: 0.7 }}>▲</span>
        </div>
      </>
    );
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary btn-small"
              onClick={() => setIsMinimized(true)}
              title="Minimize tutorial"
            >
              ▼ Hide
            </button>
            {state.tutorialStage !== 1 && (
              <button 
                className="btn-secondary btn-small"
                onClick={onDismiss}
              >
                Skip All
              </button>
            )}
          </div>
        </div>
        
        <h3 className="tutorial-title">{config.title}</h3>
        
        <p className="tutorial-content" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          {config.description}
        </p>

        {/* Step-by-step guide - the main improvement */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '12px',
          border: '1px solid var(--accent-primary)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--accent-primary)' }}>
            📋 Next Steps:
          </div>
          {steps.map((step, i) => (
            <div 
              key={i} 
              style={{ 
                fontSize: '0.85rem', 
                marginBottom: '4px',
                color: step.startsWith('✓') ? 'var(--success)' : 'var(--text-primary)'
              }}
            >
              {step}
            </div>
          ))}
        </div>

        <div className="tutorial-objective" style={{ marginBottom: '12px' }}>
          <div className="tutorial-objective-label">🎯 Goal: {config.objective}</div>
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: '12px' }}>
          <div className="progress-bar">
            <div 
              className="progress-fill info"
              style={{ width: `${(Number(config.stage) - 1) / 5 * 100}%` }}
            />
          </div>
        </div>

        <div className="tutorial-actions" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primary btn-small"
            onClick={() => setIsMinimized(true)}
          >
            Got it! ✓
          </button>
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
