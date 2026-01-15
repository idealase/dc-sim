import React from 'react';
import type { GameState } from '../../sim';
import { calculateRunScore, analyzeFailure } from '../../sim';

interface RunSummaryProps {
  state: GameState;
  onRestart: () => void;
}

export const RunSummary: React.FC<RunSummaryProps> = ({ state, onRestart }) => {
  const score = calculateRunScore(state);
  const failureAnalysis = analyzeFailure(state);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'var(--success)';
    if (grade.startsWith('B')) return 'var(--info)';
    if (grade.startsWith('C')) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          {state.isFailed ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>💥</div>
              <h2 className="failure-title">
                {failureAnalysis?.title || 'Run Failed'}
              </h2>
              <p className="failure-description">
                {failureAnalysis?.description}
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
              <h2 style={{ color: 'var(--success)' }}>Run Complete!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                You survived {state.stats.weeksCompleted} weeks of operations!
              </p>
            </>
          )}
        </div>

        {/* Scores */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '4rem', 
            fontWeight: '700',
            color: getGradeColor(score.grades.efficiency.grade)
          }}>
            {score.totalScore}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Total Score</div>
        </div>

        <div className="score-grid">
          <div className="score-item">
            <div className="score-grade" style={{ color: getGradeColor(score.grades.efficiency.grade) }}>
              {score.grades.efficiency.grade}
            </div>
            <div className="score-label">Efficiency</div>
            <div className="score-detail">{score.grades.efficiency.detail}</div>
          </div>
          <div className="score-item">
            <div className="score-grade" style={{ color: getGradeColor(score.grades.sustainability.grade) }}>
              {score.grades.sustainability.grade}
            </div>
            <div className="score-label">Sustainability</div>
            <div className="score-detail">{score.grades.sustainability.detail}</div>
          </div>
          <div className="score-item">
            <div className="score-grade" style={{ color: getGradeColor(score.grades.reliability.grade) }}>
              {score.grades.reliability.grade}
            </div>
            <div className="score-label">Reliability</div>
            <div className="score-detail">{score.grades.reliability.detail}</div>
          </div>
          <div className="score-item">
            <div className="score-grade" style={{ color: getGradeColor(score.grades.growth.grade) }}>
              {score.grades.growth.grade}
            </div>
            <div className="score-label">Growth</div>
            <div className="score-detail">{score.grades.growth.detail}</div>
          </div>
        </div>

        {/* Achievements */}
        {score.achievements.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '8px' }}>Achievements</h4>
            <div className="achievements">
              {score.achievements.map((achievement, i) => (
                <span key={i} className="achievement">{achievement}</span>
              ))}
            </div>
          </div>
        )}

        {/* Causal Chain for failures */}
        {failureAnalysis && (
          <>
            <div className="causal-chain">
              <h4>🔗 What Went Wrong</h4>
              {failureAnalysis.rootCauses.slice(0, 5).map((cause, i) => (
                <div key={i} className="causal-item">
                  {i + 1}. {cause}
                </div>
              ))}
            </div>

            <div className="suggestions">
              <h4>💡 What You Could Try</h4>
              {failureAnalysis.suggestions.map((suggestion, i) => (
                <div key={i} className="suggestion-item">
                  <span className="suggestion-bullet">→</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Causal trace from game */}
        {state.causalTrace.length > 0 && (
          <div className="causal-chain">
            <h4>📊 Key Events</h4>
            {state.causalTrace.slice(-8).map((entry, i) => (
              <div key={i} className="causal-item">
                <span style={{ color: 'var(--text-muted)' }}>W{entry.tick}:</span>{' '}
                {entry.cause} → {entry.effect}
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-primary" onClick={onRestart}>
            🔄 Restart Run
          </button>
        </div>
      </div>
    </div>
  );
};
