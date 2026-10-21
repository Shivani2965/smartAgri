import React, { useMemo } from 'react';
import {
  Clock3,
  Droplets,
  RefreshCw,
  ShieldCheck,
  ThermometerSun,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HardwareState } from '../types';
import { TelemetryReading, calculateSoilMoisturePct } from '../services/telemetryService';

interface IrrigationProps {
  data: HardwareState;
  readings: TelemetryReading[];
  pump: boolean;
  togglePump: () => void;
  autoIrrigation: boolean;
  setAutoIrrigation: (val: boolean) => void;
  threshold: number;
  setThreshold: (val: number) => void;
  notify: (msg: string) => void;
}

export function Irrigation({
  data,
  readings,
  pump,
  togglePump,
  autoIrrigation,
  setAutoIrrigation,
  threshold,
  setThreshold,
  notify,
}: IrrigationProps) {
  const currentMoisturePct = useMemo(() => {
    return calculateSoilMoisturePct(data.soilMoistureRaw) ?? 34;
  }, [data.soilMoistureRaw]);

  const isPumpActive = data.pump === 'ON' || pump;

  // Chart data
  const chartData = useMemo(() => {
    if (readings.length > 0) {
      return [...readings].reverse().slice(-20).map((r) => ({
        t: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        v: r.soilMoisturePct ?? calculateSoilMoisturePct(r.soilMoistureRaw) ?? 35,
        raw: r.soilMoistureRaw,
      }));
    }
    return [
      { t: '06:00', v: 38 },
      { t: '08:00', v: 35 },
      { t: '10:00', v: 31 },
      { t: '12:00', v: 28 },
      { t: '14:00', v: 34 },
      { t: '16:00', v: 41 },
      { t: '18:00', v: 44 },
      { t: '20:00', v: 42 },
    ];
  }, [readings]);

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">WATER MANAGEMENT & SOIL HEALTH</div>
          <h2>Smart irrigation system</h2>
          <p>
            Monitor live soil moisture levels from the Arduino probe, set threshold automation,
            and control water pump relay operation.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => notify('Irrigation readings synchronized with sensor feed')}
        >
          <RefreshCw size={16} /> Sync readings
        </button>
      </div>

      <div className="stats-grid three">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon blue">
              <Droplets size={19} />
            </div>
          </div>
          <div className="stat-label">Current soil moisture</div>
          <div className="stat-value">
            {currentMoisturePct}
            <small>%</small>
          </div>
          <div className="stat-trend">
            {currentMoisturePct < threshold ? (
              <span className="warning-text">Dry · Needs irrigation</span>
            ) : (
              'Healthy · Optimal range'
            )}
            <span>(Raw analog: {data.soilMoistureRaw ?? '—'})</span>
          </div>
          <div className="stat-footer">
            {data.lastMessageAt ? `Last read: ${new Date(data.lastMessageAt).toLocaleTimeString()}` : 'Awaiting sensor reading'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon amber">
              <ThermometerSun size={19} />
            </div>
          </div>
          <div className="stat-label">Moisture threshold</div>
          <div className="stat-value">
            {threshold}
            <small>%</small>
          </div>
          <div className="stat-trend">
            Auto trigger
            <span>when moisture drops below {threshold}%</span>
          </div>
          <div className="stat-footer">
            Adjustable via slider below
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon green">
              <Clock3 size={19} />
            </div>
          </div>
          <div className="stat-label">Water pump state</div>
          <div className="stat-value">
            {isPumpActive ? 'RUNNING' : 'STANDBY'}
          </div>
          <div className="stat-trend">
            Relay Pin D7
            <span>{isPumpActive ? '· Delivering water' : '· Idle'}</span>
          </div>
          <div className="stat-footer">
            {autoIrrigation ? 'Auto irrigation enabled' : 'Manual control active'}
          </div>
        </div>
      </div>

      <div className="content-grid subpage-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Soil moisture history</h3>
              <p>Continuous readings over time</p>
            </div>
            <span className={`status-chip ${currentMoisturePct < threshold ? 'warning' : 'good'}`}>
              ● {currentMoisturePct < threshold ? 'Moisture Low' : 'Healthy Target'}
            </span>
          </div>

          <div className="large-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="moistureFill2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4c9b72" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4c9b72" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Soil Moisture']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e7ebe4', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  name="Moisture %"
                  stroke="#3d8a60"
                  strokeWidth={2.5}
                  fill="url(#moistureFill2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel control-panel">
          <div className="panel-head">
            <div>
              <h3>Irrigation controls</h3>
              <p>Manage automation and relay override</p>
            </div>
          </div>

          <div className="control-switch-row">
            <div className="control-big-icon blue">
              <Droplets size={22} />
            </div>
            <div className="control-desc">
              <b>Automatic irrigation</b>
              <span>Automatically activate pump when moisture falls below {threshold}%</span>
            </div>
            <button
              className={`switch ${autoIrrigation ? 'on' : ''}`}
              onClick={() => setAutoIrrigation(!autoIrrigation)}
              role="switch"
              aria-checked={autoIrrigation}
            >
              <span />
            </button>
          </div>

          <div className="threshold-setting">
            <div className="setting-label">
              <span>Moisture trigger threshold</span>
              <b>{threshold}%</b>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>10% · Dry soil</span>
              <span>40% · Ideal</span>
              <span>70% · Moist</span>
            </div>
          </div>

          <div className="pump-control">
            <div>
              <b>Water pump relay</b>
              <span className={isPumpActive ? 'pump-running' : 'pump-stopped'}>
                ● {isPumpActive ? 'Relay Energized (ON)' : 'Relay Open (OFF)'}
              </span>
            </div>
            <button
              className={`btn ${isPumpActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={togglePump}
            >
              <Zap size={16} />
              {isPumpActive ? 'Stop pump' : 'Start pump'}
            </button>
          </div>

          <p className="safety-note">
            <ShieldCheck size={15} />
            Hardware note: Relay commands can be executed directly or managed automatically by the sketch when low moisture is sensed.
          </p>
        </section>
      </div>
    </>
  );
}
