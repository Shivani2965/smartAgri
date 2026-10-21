import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bluetooth,
  Check,
  Droplets,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AlertEvent } from '../services/telemetryService';

interface ActivityAlertsProps {
  events: AlertEvent[];
  onClearEvents: () => void;
  notify: (msg: string) => void;
}

export function ActivityAlerts({
  events,
  onClearEvents,
  notify,
}: ActivityAlertsProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.module === filter;
  });

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">SYSTEM LOGS & THRESHOLD NOTIFICATIONS</div>
          <h2>Activity & alerts log</h2>
          <p>
            Review automated sensor triggers, hardware connection states, and irrigation cycles
            recorded across your smart agriculture farm.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => notify('Activity log refreshed')}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="filters-row">
        <div className="filter-label">Filter by module:</div>
        <div className="range-tabs">
          {[
            { id: 'all', label: 'All events' },
            { id: 'irrigation', label: 'Irrigation' },
            { id: 'streetlight', label: 'Streetlights' },
            { id: 'dustbin', label: 'Dustbin' },
            { id: 'system', label: 'System & Bridge' },
          ].map((item) => (
            <button
              key={item.id}
              className={filter === item.id ? 'selected' : ''}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="muted-label">
          {filteredEvents.length} events logged
        </span>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Activity log feed</h3>
            <p>Chronological alerts & notifications</p>
          </div>
          {events.length > 0 && (
            <button className="text-button" onClick={onClearEvents}>
              Clear event list
            </button>
          )}
        </div>

        {filteredEvents.length > 0 ? (
          <div className="event-list">
            {filteredEvents.map((e, i) => (
              <div className="event-row" key={e.id || i}>
                <div className={`event-icon ${e.color || 'blue'}`}>
                  {e.module === 'irrigation' ? (
                    <Droplets size={16} />
                  ) : e.module === 'streetlight' ? (
                    <Lightbulb size={16} />
                  ) : e.module === 'dustbin' ? (
                    <Trash2 size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                </div>
                <div className="event-copy">
                  <b>{e.title}</b>
                  <span>{e.detail}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <time>
                    {e.timestamp ? new Date(e.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }) : 'Just now'}
                  </time>
                  <div style={{ fontSize: 9, color: '#889988', marginTop: 2 }}>
                    {e.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Check size={28} />
            <b>You're all caught up</b>
            <span>No alerts recorded for the selected filter.</span>
          </div>
        )}
      </section>

      <section className="panel info-panel">
        <h3>Configured Alert Rules</h3>
        <div className="rule-grid">
          <div>
            <Droplets size={18} />
            <b>Low soil moisture warning</b>
            <span>
              Triggers when moisture falls below the configured threshold (e.g. 30%),
              alerting staff and activating irrigation.
            </span>
          </div>
          <div>
            <Trash2 size={18} />
            <b>Dustbin capacity limit</b>
            <span>
              Triggers when waste level reaches 80% or ultrasonic distance drops below 6cm,
              flagging bin for immediate pickup.
            </span>
          </div>
          <div>
            <Bluetooth size={18} />
            <b>Hardware disconnection</b>
            <span>
              Triggers if the Arduino USB/Bluetooth bridge stops reporting telemetry
              for more than 5 seconds.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
