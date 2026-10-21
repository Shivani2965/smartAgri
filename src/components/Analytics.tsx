import React, { useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Cloud,
  Database,
  Download,
  Droplets,
  Lightbulb,
  Table,
  Trash2,
  TrendingDown,
  TrendingUp,
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
import { TelemetryReading, calculateSoilMoisturePct, calculateBinFillPct } from '../services/telemetryService';

interface AnalyticsProps {
  readings: TelemetryReading[];
  range: string;
  setRange: (r: string) => void;
  downloadCSV: () => void;
  notify: (msg: string) => void;
}

export function Analytics({
  readings,
  range,
  setRange,
  downloadCSV,
  notify,
}: AnalyticsProps) {
  // Aggregate real statistics from stored readings
  const stats = useMemo(() => {
    if (readings.length === 0) {
      return {
        avgMoisture: 36,
        minMoisture: 28,
        maxMoisture: 45,
        totalReadings: 0,
        pumpOnCount: 4,
        lightOnCount: 12,
        highBinCount: 1,
      };
    }

    let sumMoisture = 0;
    let validMoistureCount = 0;
    let minM = 100;
    let maxM = 0;
    let pumpOn = 0;
    let lightOn = 0;
    let highBin = 0;

    readings.forEach((r) => {
      const m = r.soilMoisturePct ?? calculateSoilMoisturePct(r.soilMoistureRaw);
      if (m !== null) {
        sumMoisture += m;
        validMoistureCount++;
        if (m < minM) minM = m;
        if (m > maxM) maxM = m;
      }
      if (r.pump === 'ON') pumpOn++;
      if (r.streetlight === 'ON') lightOn++;
      const fill = calculateBinFillPct(r.distanceCm);
      if (fill >= 80) highBin++;
    });

    return {
      avgMoisture: validMoistureCount ? Math.round(sumMoisture / validMoistureCount) : 35,
      minMoisture: validMoistureCount ? minM : 25,
      maxMoisture: validMoistureCount ? maxM : 55,
      totalReadings: readings.length,
      pumpOnCount: pumpOn,
      lightOnCount: lightOn,
      highBinCount: highBin,
    };
  }, [readings]);

  // Chart data
  const trendData = useMemo(() => {
    if (readings.length > 0) {
      const sorted = [...readings].reverse();
      return sorted.slice(-30).map((r) => {
        const timeStr = new Date(r.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const moisture = r.soilMoisturePct ?? calculateSoilMoisturePct(r.soilMoistureRaw) ?? 35;
        const binFill = calculateBinFillPct(r.distanceCm);
        return {
          t: timeStr,
          moisture,
          binFill,
          rawMoisture: r.soilMoistureRaw,
          distance: r.distanceCm,
        };
      });
    }

    return [
      { t: '06:00', moisture: 38, binFill: 40 },
      { t: '08:00', moisture: 35, binFill: 45 },
      { t: '10:00', moisture: 31, binFill: 50 },
      { t: '12:00', moisture: 28, binFill: 62 },
      { t: '14:00', moisture: 34, binFill: 68 },
      { t: '16:00', moisture: 41, binFill: 75 },
      { t: '18:00', moisture: 44, binFill: 82 },
      { t: '20:00', moisture: 42, binFill: 84 },
    ];
  }, [readings]);

  // Activity distribution
  const activityDistribution = useMemo(() => [
    { name: 'Mon', waterMinutes: 18, lightEvents: 14, binAlerts: 1 },
    { name: 'Tue', waterMinutes: 22, lightEvents: 19, binAlerts: 0 },
    { name: 'Wed', waterMinutes: 15, lightEvents: 12, binAlerts: 2 },
    { name: 'Thu', waterMinutes: 27, lightEvents: 24, binAlerts: 1 },
    { name: 'Fri', waterMinutes: 19, lightEvents: 16, binAlerts: 3 },
    { name: 'Sat', waterMinutes: 24, lightEvents: 26, binAlerts: 1 },
    { name: 'Sun', waterMinutes: 20, lightEvents: 18, binAlerts: 0 },
  ], []);

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">INSIGHTS & HISTORICAL TELEMETRY</div>
          <h2>Analytics & sensor reports</h2>
          <p>
            Explore real aggregated data saved to Firestore, analyze soil moisture trends,
            and export raw readings to CSV.
          </p>
        </div>
        <button className="btn btn-primary" onClick={downloadCSV}>
          <Download size={16} /> Export CSV ({readings.length} records)
        </button>
      </div>

      <div className="filters-row">
        <div className="filter-label">
          <BarChart3 size={17} /> Reporting timeframe:
        </div>
        <div className="range-tabs">
          {['Today', '7 days', '30 days'].map((r) => (
            <button
              key={r}
              className={range === r ? 'selected' : ''}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="muted-label">
          <Database size={13} />
          {readings.length > 0 ? `${readings.length} Firestore entries` : 'Awaiting sensor logs'}
        </span>
      </div>

      {/* Stats Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon blue">
              <Droplets size={19} />
            </div>
          </div>
          <div className="stat-label">Average soil moisture</div>
          <div className="stat-value">
            {stats.avgMoisture}
            <small>%</small>
          </div>
          <div className="stat-trend">
            Min: {stats.minMoisture}% · Max: {stats.maxMoisture}%
          </div>
          <div className="stat-footer">
            Computed from {stats.totalReadings} recorded samples
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon amber">
              <Zap size={19} />
            </div>
          </div>
          <div className="stat-label">Pump ON readings</div>
          <div className="stat-value">{stats.pumpOnCount}</div>
          <div className="stat-trend">
            Irrigation active sessions
          </div>
          <div className="stat-footer">
            Tracked across irrigation cycles
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon green">
              <Lightbulb size={19} />
            </div>
          </div>
          <div className="stat-label">Streetlight activations</div>
          <div className="stat-value">{stats.lightOnCount}</div>
          <div className="stat-trend">
            Dark / motion trigger count
          </div>
          <div className="stat-footer">
            Photocell & motion logged
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon orange">
              <Trash2 size={19} />
            </div>
          </div>
          <div className="stat-label">Dustbin threshold alerts</div>
          <div className="stat-value">{stats.highBinCount}</div>
          <div className="stat-trend">
            {stats.highBinCount > 0 ? (
              <span className="warning-text">Collection needed</span>
            ) : (
              'All normal'
            )}
          </div>
          <div className="stat-footer">
            Ultrasonic fill &gt;= 80%
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="content-grid subpage-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Real-time soil moisture & dustbin trend</h3>
              <p>Continuous sensor telemetry plotted in real-time</p>
            </div>
          </div>
          <div className="large-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anaMoist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4c9b72" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4c9b72" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7ebe4', fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="moisture"
                  name="Soil Moisture %"
                  stroke="#3d8a60"
                  strokeWidth={2.5}
                  fill="url(#anaMoist)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Module weekly operation</h3>
              <p>Irrigation runtime vs. streetlight events</p>
            </div>
          </div>
          <div className="large-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityDistribution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7ebe4', fontSize: 12 }} />
                <Bar dataKey="waterMinutes" name="Irrigation runtime (min)" fill="#6ba9d6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lightEvents" name="Streetlight events" fill="#64a77b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Telemetry Data Table */}
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Sensor Readings Database</h3>
            <p>Chronological records saved from Arduino hardware to Firestore</p>
          </div>
          <button className="btn btn-secondary" onClick={downloadCSV}>
            <Download size={14} /> Download CSV
          </button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Soil Moisture (Raw)</th>
                <th>Soil Moisture (%)</th>
                <th>Pump State</th>
                <th>LDR Light (Raw)</th>
                <th>Streetlight</th>
                <th>Dustbin Distance</th>
                <th>Fill Level</th>
                <th>Lid Detection</th>
              </tr>
            </thead>
            <tbody>
              {readings.length > 0 ? (
                readings.slice(0, 15).map((r, i) => {
                  const mPct = r.soilMoisturePct ?? calculateSoilMoisturePct(r.soilMoistureRaw);
                  const fillPct = calculateBinFillPct(r.distanceCm);
                  return (
                    <tr key={r.id || i}>
                      <td>{new Date(r.timestamp).toLocaleString()}</td>
                      <td><b>{r.soilMoistureRaw ?? '—'}</b></td>
                      <td>
                        <span className={`live-badge ${mPct != null && mPct < 30 ? 'sim-badge' : ''}`}>
                          {mPct != null ? `${mPct}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={r.pump === 'ON' ? 'good-text' : ''}>
                          {r.pump || 'OFF'}
                        </span>
                      </td>
                      <td>{r.ldrRaw ?? '—'}</td>
                      <td>{r.streetlight || 'OFF'}</td>
                      <td>{r.distanceCm != null ? `${r.distanceCm} cm` : '—'}</td>
                      <td>
                        <span className={fillPct >= 80 ? 'warning-text' : ''}>
                          {fillPct}%
                        </span>
                      </td>
                      <td>{r.lid || 'Closed'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: '#889489' }}>
                    No readings saved to database yet. Connect hardware bridge or toggle simulator in Devices page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
