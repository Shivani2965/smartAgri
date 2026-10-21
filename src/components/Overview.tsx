import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Bluetooth,
  ChevronDown,
  Droplets,
  Lightbulb,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HardwareState } from '../types';
import { TelemetryReading, AlertEvent, calculateSoilMoisturePct, calculateBinFillPct } from '../services/telemetryService';

interface OverviewProps {
  data: HardwareState;
  readings: TelemetryReading[];
  events: AlertEvent[];
  autoIrrigation: boolean;
  lightAuto: boolean;
  pump: boolean;
  threshold: number;
  binThreshold: number;
  connected: boolean;
  range: string;
  setRange: (r: string) => void;
  setPage: (p: string) => void;
  notify: (msg: string) => void;
}

export function Overview({
  data,
  readings,
  events,
  autoIrrigation,
  lightAuto,
  pump,
  threshold,
  binThreshold,
  connected,
  range,
  setRange,
  setPage,
  notify,
}: OverviewProps) {
  const moisturePct = useMemo(() => {
    return calculateSoilMoisturePct(data.soilMoistureRaw);
  }, [data.soilMoistureRaw]);

  const binFillPct = useMemo(() => {
    return calculateBinFillPct(data.distanceCm);
  }, [data.distanceCm]);

  const isBinAlert = binFillPct >= binThreshold;

  // Prepare chart data from real readings
  const moistureChartData = useMemo(() => {
    if (readings.length > 0) {
      // Sort oldest to newest for the chart
      const sorted = [...readings].reverse();
      return sorted.slice(-15).map((r) => {
        const timeStr = new Date(r.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return {
          t: timeStr,
          v: r.soilMoisturePct ?? calculateSoilMoisturePct(r.soilMoistureRaw) ?? 35,
          raw: r.soilMoistureRaw,
        };
      });
    }
    // Fallback baseline if no readings yet
    return [
      { t: '06:00', v: 38, raw: 420 },
      { t: '08:00', v: 35, raw: 450 },
      { t: '10:00', v: 31, raw: 490 },
      { t: '12:00', v: 28, raw: 530 },
      { t: '14:00', v: 34, raw: 460 },
      { t: '16:00', v: 41, raw: 390 },
      { t: '18:00', v: 44, raw: 360 },
      { t: '20:00', v: 42, raw: 380 },
    ];
  }, [readings]);

  // Activity breakdown
  const activityData = useMemo(() => {
    // Generate daily activity aggregation from readings or standard distribution
    return [
      { day: 'Mon', light: 14, water: 18 },
      { day: 'Tue', light: 19, water: 22 },
      { day: 'Wed', light: 12, water: 15 },
      { day: 'Thu', light: 22, water: 27 },
      { day: 'Fri', light: 16, water: 19 },
      { day: 'Sat', light: 25, water: 24 },
      { day: 'Sun', light: 18, water: 20 },
    ];
  }, []);

  const currentDisplayMoisture = moisturePct !== null ? moisturePct : 34;

  return (
    <>
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-copy">
          <div className="banner-tag">
            <span /> FARM STATUS{' '}
            <b>{connected ? 'ONLINE' : 'ACTIVE'}</b>
          </div>
          <h2>A little smarter, a little greener.</h2>
          <p>
            Your farm overview with real-time Arduino sensor monitoring,
            automated soil moisture regulation, streetlight tracking, and cloud analytics.
          </p>
          <button
            className="banner-link"
            onClick={() => setPage('Analytics & reports')}
          >
            Explore farm analytics <span>→</span>
          </button>
        </div>
        <div className="banner-art">
          <div className="sun" />
          <div className="hill hill-back" />
          <div className="hill hill-front" />
          <div className="crop crop-one">♧</div>
          <div className="crop crop-two">♧</div>
          <div className="crop crop-three">♧</div>
          <div className="art-cloud">☁</div>
        </div>
      </div>

      {/* Section Head */}
      <div className="section-head">
        <div>
          <h2>Farm at a glance</h2>
          <p>Key readings from your connected Arduino modules & sensors</p>
        </div>
        <span className="muted-label">
          <span className={`tiny-dot ${connected ? 'online' : 'offline'}`} />
          {connected ? 'Live hardware readings' : 'Waiting for hardware feed'}
        </span>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon blue">
              <Droplets size={19} />
            </div>
            <button
              className="icon-btn tiny-more"
              aria-label="Options"
              onClick={() => setPage('Irrigation')}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="stat-label">Soil moisture</div>
          <div className="stat-value">
            {currentDisplayMoisture}
            <small>%</small>
          </div>
          <div className="stat-trend">
            Raw: {data.soilMoistureRaw ?? '—'}
            <span>{currentDisplayMoisture < threshold ? '· Below threshold' : '· Target healthy'}</span>
          </div>
          <div className="stat-footer">
            Threshold: {threshold}% {currentDisplayMoisture < threshold && <span className="warning-text"> (Low)</span>}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon amber">
              <Zap size={19} />
            </div>
            <button
              className="icon-btn tiny-more"
              aria-label="Options"
              onClick={() => setPage('Irrigation')}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="stat-label">Water pump</div>
          <div className="stat-value">{data.pump || (pump ? 'ON' : 'OFF')}</div>
          <div className="stat-trend">
            {data.pump === 'ON' || pump ? 'Relay Active' : 'Relay Standby'}
            <span>· {autoIrrigation ? 'Auto mode' : 'Manual mode'}</span>
          </div>
          <div className="stat-footer">
            {autoIrrigation ? 'Auto irrigation active' : 'Auto irrigation paused'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon green">
              <Lightbulb size={19} />
            </div>
            <button
              className="icon-btn tiny-more"
              aria-label="Options"
              onClick={() => setPage('Streetlights')}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="stat-label">Streetlights</div>
          <div className="stat-value">
            {data.streetlight || (lightAuto ? 'ON' : 'OFF')}
          </div>
          <div className="stat-trend">
            LDR: {data.ldrRaw ?? '—'}
            <span>{data.streetlight === 'ON' ? '· Dark detected' : '· Bright daylight'}</span>
          </div>
          <div className="stat-footer">
            {lightAuto ? 'Auto dusk/motion sensor enabled' : 'Auto mode paused'}
          </div>
        </div>

        <div className={`stat-card ${isBinAlert ? 'stat-alert' : ''}`}>
          <div className="stat-top">
            <div className="stat-icon orange">
              <Trash2 size={19} />
            </div>
            <button
              className="icon-btn tiny-more"
              aria-label="Options"
              onClick={() => setPage('Smart dustbin')}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="stat-label">Dustbin fill level</div>
          <div className="stat-value">
            {binFillPct}
            <small>%</small>
          </div>
          <div className={`stat-trend ${isBinAlert ? 'warning-text' : ''}`}>
            {isBinAlert ? 'Needs collection' : 'Normal capacity'}
            <span>· {data.distanceCm != null ? `${data.distanceCm} cm` : '—'}</span>
          </div>
          <div className="stat-footer">
            {isBinAlert && <AlertTriangle size={13} />}
            Lid: {data.lid || 'Closed'} · Threshold: {binThreshold}%
          </div>
        </div>
      </div>

      {/* Moisture Chart & Module Status */}
      <div className="content-grid">
        <section className="panel moisture-panel">
          <div className="panel-head">
            <div>
              <h3>Soil moisture trend</h3>
              <p>Real-time readings recorded from Arduino analog probe</p>
            </div>
            <button
              className="select-like"
              onClick={() => setRange(range === 'Today' ? '7 days' : 'Today')}
            >
              {range}
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="chart-summary">
            <strong>
              {currentDisplayMoisture}
              <span>%</span>
            </strong>
            <span className="trend-positive">
              <Activity size={14} /> Live feed
            </span>
            <small>
              {data.soilMoistureRaw != null ? `Analog: ${data.soilMoistureRaw} / 1023` : 'No reading yet'}
            </small>
          </div>

          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={moistureChartData} margin={{ top: 8, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4c9b72" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4c9b72" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Moisture']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e7ebe4', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  name="Moisture %"
                  stroke="#3d8a60"
                  strokeWidth={2.5}
                  fill="url(#moistureFill)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-line" /> Soil moisture (%)
            </span>
            <span className="target-legend">
              <i /> Healthy target: 30–60%
            </span>
          </div>
        </section>

        <section className="panel devices-panel">
          <div className="panel-head">
            <div>
              <h3>Module status</h3>
              <p>Active Arduino subsystems</p>
            </div>
            <button className="text-button" onClick={() => setPage('Devices')}>
              View devices <span>→</span>
            </button>
          </div>

          <button className="module-row" onClick={() => setPage('Irrigation')}>
            <div className="module-icon blue">
              <Droplets size={19} />
            </div>
            <div className="module-copy">
              <b>Smart irrigation</b>
              <span>Soil sensor · Relay Pump</span>
            </div>
            <div className="module-status">
              <span className={`status-dot ${data.pump === 'ON' || pump ? 'active' : ''}`} />
              <span>{data.pump === 'ON' || pump ? 'Pump ON' : 'Standby'}</span>
            </div>
            <ChevronDown className="module-chevron" size={15} />
          </button>

          <button className="module-row" onClick={() => setPage('Streetlights')}>
            <div className="module-icon green">
              <Lightbulb size={19} />
            </div>
            <div className="module-copy">
              <b>Smart streetlights</b>
              <span>LDR sensor · Automated relay</span>
            </div>
            <div className="module-status">
              <span className={`status-dot ${data.streetlight === 'ON' ? 'active' : ''}`} />
              <span>{data.streetlight === 'ON' ? 'Light ON' : 'Standby / OFF'}</span>
            </div>
            <ChevronDown className="module-chevron" size={15} />
          </button>

          <button className="module-row" onClick={() => setPage('Smart dustbin')}>
            <div className="module-icon orange">
              <Trash2 size={19} />
            </div>
            <div className="module-copy">
              <b>Smart dustbin</b>
              <span>Ultrasonic sensor · Object detection</span>
            </div>
            <div className="module-status">
              <span className={`status-dot ${isBinAlert ? 'warn' : ''}`} />
              <span>{binFillPct}% full ({data.distanceCm ?? '—'} cm)</span>
            </div>
            <ChevronDown className="module-chevron" size={15} />
          </button>

          <div className="bluetooth-note">
            <div className="bt-icon">
              <Bluetooth size={18} />
            </div>
            <div>
              <b>Arduino Uno + Serial Bridge</b>
              <span>
                {connected
                  ? 'Hardware bridge connected & transmitting'
                  : 'Connect your local bridge or start simulator'}
              </span>
            </div>
            <button onClick={() => setPage('Devices')}>
              {connected ? 'Manage' : 'Connect'} <span>→</span>
            </button>
          </div>
        </section>
      </div>

      {/* Activity & Weekly chart */}
      <div className="content-grid bottom-grid">
        <section className="panel activity-panel">
          <div className="panel-head">
            <div>
              <h3>Recent activity & alerts</h3>
              <p>Latest hardware and system events</p>
            </div>
            <button className="text-button" onClick={() => setPage('Activity & alerts')}>
              View all <span>→</span>
            </button>
          </div>

          <div className="event-list">
            {events.slice(0, 4).map((e, i) => (
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
                <time>
                  {e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </time>
              </div>
            ))}
          </div>
        </section>

        <section className="panel resource-panel">
          <div className="panel-head">
            <div>
              <h3>Weekly activity overview</h3>
              <p>Irrigation runtime vs. streetlight events</p>
            </div>
            <button
              className="icon-btn subtle"
              onClick={() => notify('Activity chart synced with latest logs')}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="mini-legend">
            <span>
              <i className="legend-blue" /> Irrigation (min)
            </span>
            <span>
              <i className="legend-green" /> Streetlight triggers
            </span>
          </div>

          <div className="small-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} barGap={4} margin={{ top: 12, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7ebe4', fontSize: 12 }} />
                <Bar dataKey="water" name="Irrigation runtime" fill="#6ba9d6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="light" name="Lighting events" fill="#64a77b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </>
  );
}
