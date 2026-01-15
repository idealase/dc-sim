import React from 'react';
import type { GameEvent } from '../../sim';

interface EventTickerProps {
  events: GameEvent[];
}

export const EventTicker: React.FC<EventTickerProps> = ({ events }) => {
  // Show most recent events first
  const recentEvents = [...events].reverse().slice(0, 15);

  return (
    <div className="event-ticker">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          📰 Event Feed
        </h4>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {events.length} events
        </span>
      </div>
      
      {recentEvents.length === 0 ? (
        <div style={{ 
          color: 'var(--text-muted)', 
          fontSize: '0.85rem',
          textAlign: 'center',
          padding: '8px'
        }}>
          Events will appear here as the simulation runs...
        </div>
      ) : (
        <div className="event-list">
          {recentEvents.map(event => (
            <div key={event.id} className={`event-item ${event.severity}`}>
              <span className="event-tick">W{event.tick}</span>
              <span>{event.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
