import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, RegionId, PlayerAction, TutorialStage } from '../sim';
import {
  createInitialState,
  step,
  processAction,
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  saveTutorialProgress,
} from '../sim';
import { Dashboard } from '../components/Dashboard';
import { MapBoard } from '../components/MapBoard';
import { Controls } from '../components/Controls';
import { EventTicker } from '../components/EventTicker';
import { TutorialOverlay, StageAdvanceModal } from '../components/Tutorial';
import { RunSummary } from '../components/RunSummary';

const TICK_INTERVAL_MS = 500; // Half second per week

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>('region_a');
  const [showStageModal, setShowStageModal] = useState(false);
  const [prevStage, setPrevStage] = useState<TutorialStage>(1);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

  const intervalRef = useRef<number | null>(null);

  // Game loop
  useEffect(() => {
    if (state.isRunning && !state.isPaused && !state.isFailed) {
      intervalRef.current = window.setInterval(() => {
        setState((prev: GameState) => step(prev));
      }, TICK_INTERVAL_MS / simSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.isPaused, state.isFailed, simSpeed]);

  // Check for stage advancement
  useEffect(() => {
    if (state.stageJustAdvanced && state.tutorialStage !== prevStage) {
      setShowStageModal(true);
      saveTutorialProgress(state.tutorialStage);
    }
    setPrevStage(state.tutorialStage);
  }, [state.tutorialStage, state.stageJustAdvanced, prevStage]);

  const handleStart = useCallback(() => {
    setState((prev: GameState) => startSimulation(prev));
  }, []);

  const handlePause = useCallback(() => {
    setState((prev: GameState) => pauseSimulation(prev));
  }, []);

  const handleResume = useCallback(() => {
    setState((prev: GameState) => resumeSimulation(prev));
  }, []);

  const handleRestart = useCallback(() => {
    setState(createInitialState());
    setSelectedRegion('region_a');
    setShowStageModal(false);
    setTutorialDismissed(false);
  }, []);

  const handleAction = useCallback((action: PlayerAction) => {
    setState((prev: GameState) => processAction(prev, action));
  }, []);

  const handleDismissTutorial = useCallback(() => {
    setTutorialDismissed(true);
    setState((prev: GameState) => ({
      ...prev,
      tutorialStage: 'complete' as TutorialStage,
      tutorialCompleted: true,
    }));
  }, []);

  const formatWeek = (tick: number) => {
    const year = Math.floor(tick / 52) + 1;
    const week = (tick % 52) + 1;
    return `Y${year} W${week}`;
  };

  return (
    <div className="app-container">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <h1 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span>
            <span>AI Data Center Sim</span>
          </h1>
          <span style={{ 
            fontSize: '0.8rem', 
            color: 'var(--accent-primary)',
            background: 'var(--bg-tertiary)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            {state.tutorialStage === 'complete' 
              ? '🏆 All Unlocked' 
              : `Stage ${state.tutorialStage}/5`}
          </span>
        </div>

        <div className="top-bar-center">
          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '8px 16px', 
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '1.1rem'
          }}>
            🕐 {formatWeek(state.tick)}
          </div>
        </div>

        <div className="top-bar-right">
          {/* Speed control */}
          <select 
            value={simSpeed} 
            onChange={(e) => setSimSpeed(Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>

          {!state.isRunning && !state.isFailed && (
            <button className="btn-success" onClick={handleStart}>
              ▶️ Start
            </button>
          )}
          {state.isRunning && !state.isPaused && !state.isFailed && (
            <button className="btn-secondary" onClick={handlePause}>
              ⏸️ Pause
            </button>
          )}
          {state.isRunning && state.isPaused && !state.isFailed && (
            <button className="btn-success" onClick={handleResume}>
              ▶️ Resume
            </button>
          )}
          <button className="btn-danger" onClick={handleRestart}>
            🔄 Restart
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <MapBoard 
          state={state} 
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
        />
        <Dashboard state={state} />
        <Controls 
          state={state} 
          selectedRegion={selectedRegion}
          onAction={handleAction}
        />
        <EventTicker events={state.events} />
      </main>

      {/* Tutorial Overlay */}
      {!tutorialDismissed && !state.isFailed && (
        <TutorialOverlay 
          state={state} 
          onDismiss={handleDismissTutorial}
        />
      )}

      {/* Stage Advancement Modal */}
      {showStageModal && (
        <StageAdvanceModal
          fromStage={prevStage}
          toStage={state.tutorialStage}
          onContinue={() => setShowStageModal(false)}
        />
      )}

      {/* Run Summary (on failure) */}
      {state.isFailed && (
        <RunSummary 
          state={state} 
          onRestart={handleRestart}
        />
      )}
    </div>
  );
};
