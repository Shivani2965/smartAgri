import React, { useState } from 'react';
import {
  Bluetooth,
  Check,
  CircleHelp,
  Copy,
  Cpu,
  Database,
  Play,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { HardwareState, SerialLogItem } from '../types';

interface DevicesProps {
  data: HardwareState;
  socketConnected: boolean;
  bridgeUrl: string;
  setBridgeUrl: (url: string) => void;
  reconnectBridge: () => void;
  isSimulating: boolean;
  toggleSimulator: () => void;
  serialLogs: SerialLogItem[];
  clearSerialLogs: () => void;
  isCloudSyncActive: boolean;
  toggleCloudSync: () => void;
  notify: (msg: string) => void;
}

export function Devices({
  data,
  socketConnected,
  bridgeUrl,
  setBridgeUrl,
  reconnectBridge,
  isSimulating,
  toggleSimulator,
  serialLogs,
  clearSerialLogs,
  isCloudSyncActive,
  toggleCloudSync,
  notify,
}: DevicesProps) {
  const [copied, setCopied] = useState(false);

  const copyServerCode = () => {
    const code = `npm install express cors serialport @serialport/parser-readline socket.io
node server/index.js`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    notify('Installation command copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isFresh =
    data.lastMessageAt &&
    Date.now() - new Date(data.lastMessageAt).getTime() < 6000;

  const isLive = socketConnected && data.connected && isFresh;

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">HARDWARE BRIDGE & SERIAL TELEMETRY</div>
          <h2>Devices & connection center</h2>
          <p>
            Configure the local bridge to stream data between your Arduino UNO (USB or HC-05 Bluetooth)
            and this web dashboard with automatic Firestore synchronization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${isSimulating ? 'btn-danger' : 'btn-secondary'}`}
            onClick={toggleSimulator}
          >
            {isSimulating ? <Square size={15} /> : <Play size={15} />}
            {isSimulating ? 'Stop simulator' : 'Simulate Arduino feed'}
          </button>
        </div>
      </div>

      {/* Connection Hero */}
      <div className="connection-hero">
        <div className="connection-illustration">
          <div className="device-circle">
            {isLive ? <Wifi size={36} /> : isSimulating ? <Cpu size={36} /> : <WifiOff size={36} />}
          </div>
          <div className="connection-waves">⌁</div>
        </div>

        <div className="connection-hero-copy">
          <span className={`status-chip ${isLive ? 'good' : isSimulating ? 'warning' : 'warning'}`}>
            {isLive ? '● Live Hardware Connected' : isSimulating ? '● Running Sensor Simulator' : '● Setup Required'}
          </span>
          <h2>
            {isLive
              ? 'Arduino USB Serial Active'
              : isSimulating
              ? 'Software Sensor Simulator Active'
              : 'Arduino Serial Bridge Disconnected'}
          </h2>
          <p>
            Your Arduino communicates via Serial UART (Baud 9600) with your local machine.
            The Node.js bridge in <code>server/index.js</code> reads the COM port and pushes updates
            to this web interface over WebSocket.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                style={{
                  padding: '7px 11px',
                  borderRadius: 8,
                  border: '1px solid #d5ddd3',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  background: '#fff',
                  width: 220,
                }}
                placeholder="http://localhost:3001"
              />
              <button className="btn btn-primary" onClick={reconnectBridge}>
                <RefreshCw size={14} /> Reconnect
              </button>
            </div>

            <button
              className={`btn ${isCloudSyncActive ? 'btn-toggle-active' : 'btn-secondary'}`}
              onClick={toggleCloudSync}
              title="Save all incoming sensor readings to Firebase Firestore"
            >
              <Database size={15} />
              {isCloudSyncActive ? 'Cloud save: ON' : 'Cloud save: OFF'}
            </button>
          </div>
          <span className="small-muted">
            Bridge socket: <b>{socketConnected ? 'Connected (Port 3001)' : 'Disconnected'}</b> · Arduino serial: <b>{data.connected ? 'Open' : 'Closed'}</b>
          </span>
        </div>
      </div>

      {/* Hardware Module Cards */}
      <div className="device-cards">
        <div className="device-card">
          <div className="device-card-icon">
            <Cpu size={20} />
          </div>
          <b>Arduino UNO Microcontroller</b>
          <span>USB Serial COM5 · 9600 Baud</span>
          <div className="device-card-state">
            <i className={`tiny-dot ${data.connected ? 'online' : 'offline'}`} />
            {data.connected ? 'Port Open & Reading' : 'Awaiting COM Port'}
          </div>
        </div>

        <div className="device-card">
          <div className="device-card-icon">
            <Server size={20} />
          </div>
          <b>Node.js Serial Bridge</b>
          <span>server/index.js · Socket.io</span>
          <div className="device-card-state">
            <i className={`tiny-dot ${socketConnected ? 'online' : 'offline'}`} />
            {socketConnected ? 'Socket Link Established' : 'Offline (Start server)'}
          </div>
        </div>

        <div className="device-card">
          <div className="device-card-icon">
            <Database size={20} />
          </div>
          <b>Firebase Cloud Firestore</b>
          <span>Cloud telemetry storage & analytics</span>
          <div className="device-card-state">
            <i className={`tiny-dot ${isCloudSyncActive ? 'online' : 'offline'}`} />
            {isCloudSyncActive ? 'Saving Readings Live' : 'Cloud Save Paused'}
          </div>
        </div>
      </div>

      {/* Live Serial Monitor Terminal */}
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="#2b7a44" />
            <div>
              <h3>Live Arduino Serial Monitor</h3>
              <p>Raw text frames emitted by the Arduino sketch</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={clearSerialLogs}>
              Clear log
            </button>
          </div>
        </div>

        <div className="serial-console">
          {serialLogs.length > 0 ? (
            serialLogs.map((log) => (
              <div className="serial-line" key={log.id}>
                <span className="serial-time">[{log.timestamp}]</span>
                <span className="serial-text">{log.text}</span>
              </div>
            ))
          ) : (
            <div style={{ color: '#688c72', padding: 10 }}>
              &gt; Serial monitor active. Waiting for incoming Arduino UART frames...
              <br />
              &gt; (Tip: Click "Simulate Arduino feed" above to test live data immediately!)
            </div>
          )}
        </div>
      </section>

      {/* Setup Guide */}
      <section className="panel setup-panel">
        <div className="panel-head">
          <div>
            <h3>How to connect your physical Arduino</h3>
            <p>Step-by-step instructions for running the serial bridge</p>
          </div>
          <button className="btn btn-secondary" onClick={copyServerCode}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied command' : 'Copy run command'}
          </button>
        </div>

        {[
          [
            '01',
            'Connect Arduino UNO via USB',
            'Plug your Arduino into your computer. Check Device Manager (Windows) or System Profiler (Mac/Linux) to find the COM port (e.g., COM3, COM5, or /dev/ttyACM0).',
          ],
          [
            '02',
            'Close PuTTY & Arduino Serial Monitor',
            'Ensure no other program (like Arduino IDE Serial Monitor or PuTTY) has the COM port locked.',
          ],
          [
            '03',
            'Run the Node.js bridge server',
            'In your terminal, navigate to your server directory and run `node server/index.js`. It will open the COM port and bridge readings to port 3001.',
          ],
          [
            '04',
            'Enjoy live real-time farm dashboard & Firestore analytics',
            'This dashboard will automatically connect, show live sensor gauges, trigger alerts, and save timestamped readings to the Firestore database.',
          ],
        ].map(([n, t, d]) => (
          <div className="checklist-row" key={n}>
            <div className="step-number">{n}</div>
            <div>
              <b>{t}</b>
              <span>{d}</span>
            </div>
            <span className="step-state">
              {n === '01' && data.connected ? 'Completed' : 'Step ' + n}
            </span>
          </div>
        ))}
      </section>

      <div className="alert-box wide-alert">
        <ShieldCheck size={19} />
        <div>
          <b>Hardware and Baud Rate Compatibility</b>
          <p>
            Your Arduino sketch prints output at 9600 baud using the format:
            <code>Dustbin Distance: X cm</code>, <code>Soil Moisture: X</code>,
            <code>Pump: ON/OFF</code>, <code>LDR Reading: X</code>, and
            <code>Street Light: DARK - ON / BRIGHT - OFF</code>.
            The bridge parses these lines and sends JSON telemetry to this web application.
          </p>
        </div>
      </div>
    </>
  );
}
