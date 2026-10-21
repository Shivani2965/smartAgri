import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Leaf,
  RefreshCw,
  Trash2,
  Volume2,
} from 'lucide-react';
import { HardwareState } from '../types';
import { calculateBinFillPct } from '../services/telemetryService';

interface DustbinProps {
  data: HardwareState;
  binThreshold: number;
  notify: (msg: string) => void;
  onMarkCollection: () => void;
}

export function Dustbin({
  data,
  binThreshold,
  notify,
  onMarkCollection,
}: DustbinProps) {
  const fillPct = useMemo(() => {
    return calculateBinFillPct(data.distanceCm);
  }, [data.distanceCm]);

  const isFull = fillPct >= binThreshold;
  const isLidActive = data.lid?.toLowerCase().includes('object') || data.lid?.toLowerCase().includes('open');

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">WASTE MANAGEMENT & SANITATION</div>
          <h2>Smart dustbin & ultrasonic fill monitor</h2>
          <p>
            Track waste fill levels using ultrasonic distance measurements (HC-SR04)
            and receive automated alerts when bins require collection.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => notify('Ultrasonic reading refreshed')}
        >
          <RefreshCw size={16} /> Refresh level
        </button>
      </div>

      <div className="content-grid subpage-grid">
        <section className="panel bin-main">
          <div className="bin-visual">
            {/* Animated lid tilts when object/hand is detected */}
            <div
              className="bin-lid"
              style={{
                transform: isLidActive ? 'rotate(-25deg) translateY(-8px)' : 'rotate(-3deg)',
                transition: 'transform 0.3s ease',
              }}
            />
            <div className="bin-body">
              <div
                className="bin-fill"
                style={{
                  height: `${fillPct}%`,
                  transition: 'height 0.5s ease',
                }}
              />
              <div className="bin-mark">
                <Leaf size={25} />
              </div>
            </div>
            <div className="bin-shadow" />
          </div>

          <div className="bin-level">
            <span>Current fill level</span>
            <strong>
              {fillPct}
              <small>%</small>
            </strong>
            <span className={`status-chip ${isFull ? 'warning' : 'good'}`}>
              {isFull ? 'Collection recommended' : 'Capacity normal'}
            </span>
          </div>

          <div className="meter">
            <span
              style={{
                width: `${fillPct}%`,
                background: isFull ? '#b84b40' : fillPct > 60 ? '#d89a54' : '#438b58',
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          <div className="range-labels">
            <span>0% · Empty (25cm)</span>
            <span>Threshold: {binThreshold}%</span>
            <span>100% · Full (0cm)</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Bin telemetry details</h3>
              <p>Ultrasonic Sensor HC-SR04 · Bin 01</p>
            </div>
            <span className={`status-chip ${isFull ? 'warning' : 'good'}`}>
              {isFull ? 'Needs attention' : 'Normal state'}
            </span>
          </div>

          <div className="detail-list">
            <div>
              <span>Measured ultrasonic distance</span>
              <b>{data.distanceCm != null ? `${data.distanceCm} cm` : '—'}</b>
            </div>
            <div>
              <span>Lid detection status</span>
              <b className={isLidActive ? 'warning-text' : 'good-text'}>
                {data.lid || 'No object detected'}
              </b>
            </div>
            <div>
              <span>Collection threshold</span>
              <b>{binThreshold}% capacity</b>
            </div>
            <div>
              <span>Hardware connection</span>
              <b className={data.connected ? 'good-text' : ''}>
                ● {data.connected ? 'Arduino USB Serial' : 'Waiting for connection'}
              </b>
            </div>
            <div>
              <span>Last update received</span>
              <b>{data.lastMessageAt ? new Date(data.lastMessageAt).toLocaleTimeString() : 'Awaiting data'}</b>
            </div>
          </div>

          {isFull && (
            <div className="alert-box">
              <AlertTriangle size={18} />
              <div>
                <b>Bin is above the collection threshold</b>
                <p>
                  At {fillPct}% capacity (distance: {data.distanceCm} cm), this bin
                  requires emptying by farm sanitation staff.
                </p>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary full-btn"
            onClick={onMarkCollection}
          >
            <Trash2 size={16} /> Mark as collected / reset
          </button>
        </section>
      </div>

      <section className="panel info-panel">
        <h3>How fill level is calculated</h3>
        <p>
          Fill percentage is computed from the container's internal height (25 cm) and the
          ultrasonic sensor's echo distance to the waste surface:
          <code> Fill % = ((BinHeight - MeasuredDistance) / BinHeight) * 100</code>.
          When people approach, the proximity sensor also triggers the servo lid and reports "Dustbin: Object detected".
        </p>
      </section>
    </>
  );
}
