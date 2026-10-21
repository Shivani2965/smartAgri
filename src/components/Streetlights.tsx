import React, { useMemo } from 'react';
import {
  Activity,
  Clock3,
  Lightbulb,
  Radio,
  RefreshCw,
  SunMedium,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HardwareState } from '../types';

interface StreetlightsProps {
  data: HardwareState;
  lightAuto: boolean;
  setLightAuto: (val: boolean) => void;
  notify: (msg: string) => void;
}

export function Streetlights({
  data,
  lightAuto,
  setLightAuto,
  notify,
}: StreetlightsProps) {
  const isLightOn = data.streetlight === 'ON';

  const activityData = useMemo(() => [
    { day: 'Mon', light: 14 },
    { day: 'Tue', light: 19 },
    { day: 'Wed', light: 12 },
    { day: 'Thu', light: 24 },
    { day: 'Fri', light: 16 },
    { day: 'Sat', light: 26 },
    { day: 'Sun', light: 18 },
  ], []);

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">SMART LIGHTING & ENERGY MANAGEMENT</div>
          <h2>Streetlight & perimeter monitoring</h2>
          <p>
            Track ambient light levels from the LDR photoresistor, monitor motion events,
            and configure dusk-to-dawn automated streetlights.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => notify('Streetlight readings synchronized')}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="stats-grid three">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon green">
              <Lightbulb size={19} />
            </div>
          </div>
          <div className="stat-label">Streetlight status</div>
          <div className="stat-value">{isLightOn ? 'ACTIVE (ON)' : 'STANDBY (OFF)'}</div>
          <div className="stat-trend">
            {isLightOn ? 'Illumination active' : 'Daylight / Idle'}
            <span>· State: {data.streetlight || 'Unknown'}</span>
          </div>
          <div className="stat-footer">
            {lightAuto ? 'Automatic dusk control enabled' : 'Manual control mode'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon amber">
              <SunMedium size={19} />
            </div>
          </div>
          <div className="stat-label">LDR light sensor reading</div>
          <div className="stat-value">
            {data.ldrRaw ?? '—'}
            <small>raw</small>
          </div>
          <div className="stat-trend">
            {data.ldrRaw != null && data.ldrRaw < 500 ? (
              <span className="warning-text">Low light (Dark)</span>
            ) : (
              'Bright / Ambient daylight'
            )}
            <span>· Analog input</span>
          </div>
          <div className="stat-footer">
            {isLightOn ? 'Triggered: DARK - ON' : 'Triggered: BRIGHT - OFF'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon blue">
              <Clock3 size={19} />
            </div>
          </div>
          <div className="stat-label">Today's active illumination</div>
          <div className="stat-value">
            {isLightOn ? '5.2' : '4.6'}
            <small>h</small>
          </div>
          <div className="stat-trend">
            LED Streetlight array
            <span>· High efficiency</span>
          </div>
          <div className="stat-footer">
            Motion detection auto-dimming active
          </div>
        </div>
      </div>

      <div className="content-grid subpage-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Weekly lighting activity</h3>
              <p>Activation cycles recorded across farm lanes</p>
            </div>
          </div>
          <div className="large-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#879087' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7ebe4', fontSize: 12 }} />
                <Bar dataKey="light" name="Lighting activations" fill="#62a47a" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel control-panel">
          <div className="panel-head">
            <div>
              <h3>Lighting configuration</h3>
              <p>Configure automatic triggers & thresholds</p>
            </div>
          </div>

          <div className="control-switch-row">
            <div className="control-big-icon green">
              <Lightbulb size={22} />
            </div>
            <div className="control-desc">
              <b>Automatic streetlight control</b>
              <span>React dynamically to LDR darkness threshold and PIR motion</span>
            </div>
            <button
              className={`switch ${lightAuto ? 'on' : ''}`}
              onClick={() => setLightAuto(!lightAuto)}
              role="switch"
              aria-checked={lightAuto}
            >
              <span />
            </button>
          </div>

          <div className="info-box">
            <SunMedium size={18} />
            <div>
              <b>LDR photoresistor sensor</b>
              <span>Analog pin A1 on Arduino UNO</span>
              <small>Reports raw brightness: &lt;500 indicates dusk or night conditions.</small>
            </div>
          </div>

          <div className="info-box">
            <Radio size={18} />
            <div>
              <b>PIR motion detection</b>
              <span>Digital input on Arduino</span>
              <small>Boosts LED brightness to 100% when vehicles or farm workers are nearby.</small>
            </div>
          </div>

          <div className="info-box">
            <Zap size={18} />
            <div>
              <b>Relay / LED output state</b>
              <span>{isLightOn ? 'Currently ON (Illuminating)' : 'Currently OFF (Standby)'}</span>
              <small>Reported by sketch: "{data.lastLine.includes('Street') ? data.lastLine : (isLightOn ? 'DARK - ON' : 'BRIGHT - OFF')}"</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
