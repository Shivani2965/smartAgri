import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bluetooth,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  CloudSun,
  Cpu,
  Database,
  Download,
  Droplets,
  Gauge,
  Leaf,
  Lightbulb,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  ThermometerSun,
  Trash2,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';

import './styles.css';
import { auth, loginWithGoogle, logoutUser, testConnection } from './firebase';
import {
  saveTelemetryReading,
  subscribeToTelemetry,
  saveAlertEvent,
  subscribeToEvents,
  getSystemSettings,
  saveSystemSettings,
  clearUserEvents,
  TelemetryReading,
  AlertEvent,
  calculateSoilMoisturePct,
  calculateBinFillPct,
} from './services/telemetryService';
import { HardwareState, SerialLogItem } from './types';

// Subpage components
import { Overview } from './components/Overview';
import { Irrigation } from './components/Irrigation';
import { Streetlights } from './components/Streetlights';
import { Dustbin } from './components/Dustbin';
import { Analytics } from './components/Analytics';
import { ActivityAlerts } from './components/ActivityAlerts';
import { Devices } from './components/Devices';

const initialHardwareData: HardwareState = {
  connected: false,
  distanceCm: 18.5,
  soilMoistureRaw: 460,
  pump: 'OFF',
  ldrRaw: 620,
  streetlight: 'OFF',
  lid: 'Closed',
  lastMessageAt: null,
  lastLine: '',
  source: 'hardware',
};

const initialEventsList: AlertEvent[] = [
  {
    userId: 'default',
    title: 'Irrigation cycle standby',
    detail: 'Soil moisture stable within target range (30-60%)',
    module: 'irrigation',
    type: 'System',
    color: 'blue',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    userId: 'default',
    title: 'Dustbin proximity sensor ready',
    detail: 'HC-SR04 ultrasonic distance calibrated at 18.5 cm',
    module: 'dustbin',
    type: 'Info',
    color: 'orange',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    userId: 'default',
    title: 'Streetlight automated controller active',
    detail: 'LDR ambient photocell reading daylight levels (620 raw)',
    module: 'streetlight',
    type: 'System',
    color: 'green',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    userId: 'default',
    title: 'Arduino Serial telemetry bridge initialized',
    detail: 'Listening on Baud 9600 for incoming sensor packets',
    module: 'system',
    type: 'System',
    color: 'green',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

const navItems = [
  { label: 'Overview', icon: Gauge },
  { label: 'Irrigation', icon: Droplets },
  { label: 'Streetlights', icon: Lightbulb },
  { label: 'Smart dustbin', icon: Trash2 },
  { label: 'Analytics & reports', icon: BarChart3 },
  { label: 'Activity & alerts', icon: AlertTriangle },
];

export default function App() {
  const [page, setPage] = useState('Overview');
  const [mobileNav, setMobileNav] = useState(false);

  // Authentication & User
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Hardware telemetry state
  const [data, setData] = useState<HardwareState>(initialHardwareData);
  const [socketConnected, setSocketConnected] = useState(false);
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:3001');
  const [bridgeError, setBridgeError] = useState('');
  const [serialLogs, setSerialLogs] = useState<SerialLogItem[]>([]);

  // Telemetry history and alerts from Firestore
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>(initialEventsList);

  // System controls & automation settings
  const [pump, setPump] = useState(false);
  const [autoIrrigation, setAutoIrrigation] = useState(true);
  const [threshold, setThreshold] = useState(30);
  const [binThreshold, setBinThreshold] = useState(80);
  const [lightAuto, setLightAuto] = useState(true);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // UI helpers
  const [range, setRange] = useState('Today');
  const [toast, setToast] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const simIntervalRef = useRef<any>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Test Firestore connection on mount
  useEffect(() => {
    testConnection().then((ok) => {
      if (ok) {
        console.log('Firebase Firestore connection verified.');
      }
    });
  }, []);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        // Load user settings if saved in Firestore
        try {
          const s = await getSystemSettings();
          if (s) {
            setThreshold(s.moistureThreshold);
            setAutoIrrigation(s.autoIrrigation);
            setLightAuto(s.autoLighting);
            if (s.binAlertThreshold) setBinThreshold(s.binAlertThreshold);
          }
        } catch (err) {
          console.error('Error fetching settings:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore readings & events when user is logged in
  useEffect(() => {
    if (!user) return;
    const unsubTelemetry = subscribeToTelemetry(100, (loadedReadings) => {
      if (loadedReadings.length > 0) {
        setReadings(loadedReadings);
      }
    });

    const unsubEvents = subscribeToEvents(50, (loadedEvents) => {
      if (loadedEvents.length > 0) {
        setEvents(loadedEvents);
      }
    });

    return () => {
      unsubTelemetry();
      unsubEvents();
    };
  }, [user]);

  // Handle incoming telemetry payload (from Socket or Simulator)
  const processTelemetry = (incoming: HardwareState) => {
    setData(incoming);

    // Append to serial logs
    if (incoming.lastLine) {
      setSerialLogs((prev) => [
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          text: incoming.lastLine,
        },
        ...prev.slice(0, 49),
      ]);
    }

    // Update in-memory readings buffer
    const newReading: TelemetryReading = {
      userId: user?.uid || 'guest',
      distanceCm: incoming.distanceCm,
      soilMoistureRaw: incoming.soilMoistureRaw,
      soilMoisturePct: calculateSoilMoisturePct(incoming.soilMoistureRaw),
      pump: incoming.pump,
      ldrRaw: incoming.ldrRaw,
      streetlight: incoming.streetlight,
      lid: incoming.lid,
      rawLine: incoming.lastLine,
      timestamp: incoming.lastMessageAt || new Date().toISOString(),
    };

    setReadings((prev) => [newReading, ...prev.slice(0, 99)]);

    // Check automation rules
    const mPct = newReading.soilMoisturePct ?? 35;
    if (autoIrrigation && mPct < threshold && incoming.pump !== 'ON') {
      setPump(true);
      const alertPayload: Omit<AlertEvent, 'userId'> = {
        title: 'Auto Irrigation Triggered',
        detail: `Soil moisture dropped to ${mPct}% (below threshold ${threshold}%). Starting pump.`,
        module: 'irrigation',
        type: 'Alert',
        color: 'blue',
        timestamp: new Date().toISOString(),
      };
      setEvents((prev) => [{ ...alertPayload, userId: user?.uid || 'guest' }, ...prev]);
      if (user && isCloudSyncActive) {
        saveAlertEvent(alertPayload).catch(console.error);
      }
    }

    // Save to Firestore if user is authenticated and cloud sync is enabled
    if (user && isCloudSyncActive) {
      saveTelemetryReading(newReading).catch((err) => {
        console.error('Error auto-saving reading to Firestore:', err);
      });
    }
  };

  // Socket.io connection to local server/index.js bridge
  const connectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    try {
      const socket = io(bridgeUrl, {
        reconnection: true,
        timeout: 4000,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        setBridgeError('');
        notify(`Connected to serial bridge on ${bridgeUrl}`);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('connect_error', () => {
        setSocketConnected(false);
        setBridgeError(`Cannot reach bridge at ${bridgeUrl}. Ensure "node server/index.js" is running.`);
      });

      socket.on('telemetry', (reading: HardwareState) => {
        processTelemetry({
          ...reading,
          connected: true,
          source: 'hardware',
        });
      });

      socketRef.current = socket;
    } catch (err: any) {
      setBridgeError(`Connection error: ${err.message}`);
    }
  };

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [bridgeUrl]);

  // Simulator Mode: generate realistic sensor stream
  const toggleSimulator = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      notify('Hardware simulator stopped');
    } else {
      setIsSimulating(true);
      notify('Arduino sensor stream simulator started');

      let currentRawMoisture = 520;
      let currentLdr = 640;
      let currentDistance = 18.0;
      let simPump = 'OFF';
      let simLight = 'OFF';

      simIntervalRef.current = setInterval(() => {
        // Vary moisture
        currentRawMoisture += Math.floor(Math.random() * 15) - 7;
        currentRawMoisture = Math.max(300, Math.min(850, currentRawMoisture));

        // Vary light
        currentLdr += Math.floor(Math.random() * 20) - 10;
        currentLdr = Math.max(200, Math.min(800, currentLdr));
        simLight = currentLdr < 480 ? 'ON' : 'OFF';

        // Vary dustbin distance
        currentDistance += (Math.random() * 0.8 - 0.38);
        currentDistance = Math.max(3.5, Math.min(24.5, Number(currentDistance.toFixed(1))));

        const currentPct = calculateSoilMoisturePct(currentRawMoisture) ?? 35;
        if (currentPct < threshold) {
          simPump = 'ON';
        } else if (currentPct > threshold + 15) {
          simPump = 'OFF';
        }

        const lines = [
          `Dustbin Distance: ${currentDistance} cm`,
          `Soil Moisture: ${currentRawMoisture}`,
          `Pump: ${simPump}`,
          `LDR Reading: ${currentLdr}`,
          `Street Light: ${simLight === 'ON' ? 'DARK - ON' : 'BRIGHT - OFF'}`,
          `-----`,
        ];

        const randomLine = lines[Math.floor(Math.random() * lines.length)];

        processTelemetry({
          connected: true,
          distanceCm: currentDistance,
          soilMoistureRaw: currentRawMoisture,
          pump: simPump,
          ldrRaw: currentLdr,
          streetlight: simLight,
          lid: currentDistance < 8 ? 'Object detected' : 'Closed',
          lastMessageAt: new Date().toISOString(),
          lastLine: randomLine,
          source: 'simulator',
        });
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Manual Pump Toggle
  const togglePump = () => {
    const nextState = !pump;
    setPump(nextState);
    const pumpStr = nextState ? 'ON' : 'OFF';
    setData((prev) => ({ ...prev, pump: pumpStr }));

    const eventPayload: Omit<AlertEvent, 'userId'> = {
      title: `Water pump ${nextState ? 'started' : 'stopped'} manually`,
      detail: `Operator toggled relay status to ${pumpStr}`,
      module: 'irrigation',
      type: 'System',
      color: 'blue',
      timestamp: new Date().toISOString(),
    };

    setEvents((prev) => [{ ...eventPayload, userId: user?.uid || 'guest' }, ...prev]);
    if (user && isCloudSyncActive) {
      saveAlertEvent(eventPayload).catch(console.error);
    }
    notify(`Water pump turned ${pumpStr}`);
  };

  // Google Login / Logout
  const handleGoogleLogin = async () => {
    try {
      const res = await loginWithGoogle();
      notify(`Signed in as ${res.user.displayName || res.user.email}`);
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      notify('Sign in was canceled or not completed');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      notify('Signed out successfully');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Settings Save to Firestore
  const updateAutoIrrigation = (val: boolean) => {
    setAutoIrrigation(val);
    if (user) {
      saveSystemSettings({ autoIrrigation: val, moistureThreshold: threshold, autoLighting: lightAuto });
    }
  };

  const updateThreshold = (val: number) => {
    setThreshold(val);
    if (user) {
      saveSystemSettings({ moistureThreshold: val, autoIrrigation, autoLighting: lightAuto });
    }
  };

  const updateLightAuto = (val: boolean) => {
    setLightAuto(val);
    if (user) {
      saveSystemSettings({ autoLighting: val, autoIrrigation, moistureThreshold: threshold });
    }
  };

  // Mark collection action for dustbin
  const handleMarkCollection = () => {
    setData((prev) => ({ ...prev, distanceCm: 24.0, lid: 'Closed' }));
    const eventPayload: Omit<AlertEvent, 'userId'> = {
      title: 'Dustbin emptied & serviced',
      detail: 'Sanitation collection logged. Fill level reset to 0%.',
      module: 'dustbin',
      type: 'System',
      color: 'green',
      timestamp: new Date().toISOString(),
    };
    setEvents((prev) => [{ ...eventPayload, userId: user?.uid || 'guest' }, ...prev]);
    if (user && isCloudSyncActive) {
      saveAlertEvent(eventPayload).catch(console.error);
    }
    notify('Dustbin marked as emptied');
  };

  // CSV Export from Real Sensor Data
  const downloadCSV = () => {
    const rows = [
      ['Timestamp', 'Soil Moisture Raw', 'Soil Moisture Pct', 'Pump State', 'LDR Raw', 'Streetlight', 'Dustbin Distance (cm)', 'Fill Level Pct', 'Lid State'],
    ];

    if (readings.length > 0) {
      readings.forEach((r) => {
        const mPct = r.soilMoisturePct ?? calculateSoilMoisturePct(r.soilMoistureRaw) ?? '';
        const fill = calculateBinFillPct(r.distanceCm);
        rows.push([
          r.timestamp,
          String(r.soilMoistureRaw ?? ''),
          String(mPct),
          r.pump || 'OFF',
          String(r.ldrRaw ?? ''),
          r.streetlight || 'OFF',
          String(r.distanceCm ?? ''),
          String(fill),
          r.lid || 'Closed',
        ]);
      });
    } else {
      // Fallback example
      rows.push([new Date().toISOString(), '480', '35', 'OFF', '620', 'OFF', '18.5', '26', 'Closed']);
    }

    const csvContent = rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `smartagri-telemetry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Exported ${readings.length || 1} sensor records to CSV`);
  };

  const isFresh =
    data.lastMessageAt &&
    Date.now() - new Date(data.lastMessageAt).getTime() < 6000;

  const isConnected = (socketConnected && data.connected && isFresh) || isSimulating;

  const subtitle =
    ({
      Overview: 'Live snapshot of your smart farm modules, moisture levels, and activity.',
      Irrigation: 'Monitor soil moisture and configure automated pump relay control.',
      Streetlights: 'Track ambient LDR light levels and motion-activated illumination.',
      'Smart dustbin': 'Monitor ultrasonic fill levels and collection alerts.',
      'Analytics & reports': 'Explore real-time historical trends saved to Firebase Firestore.',
      'Activity & alerts': 'Review recent sensor alerts and system notifications.',
      Devices: 'Configure your local Arduino USB / HC-05 serial bridge and Cloud sync.',
    })[page] || 'Manage your SmartAgri automated farm system.';

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileNav ? 'show' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Sprout size={23} />
          </div>
          <div>
            <b>smartagri</b>
            <span>CONTROL CENTER</span>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="farm-switch">
          <div className="farm-icon">
            <Leaf size={17} />
          </div>
          <div className="farm-meta">
            <b>Greenfield Farm</b>
            <span>Primary IoT Node · Zone A</span>
          </div>
          <ChevronDown size={16} />
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? 'active' : ''}`}
              onClick={() => {
                setPage(label);
                setMobileNav(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Activity & alerts' && events.length > 0 && (
                <i className="nav-count">{events.length}</i>
              )}
            </button>
          ))}
        </nav>

        <div className="nav-caption device-caption">HARDWARE & CLOUD</div>
        <button
          className={`nav-item ${page === 'Devices' ? 'active' : ''}`}
          onClick={() => {
            setPage('Devices');
            setMobileNav(false);
          }}
        >
          <Cpu size={18} />
          <span>Devices & connection</span>
          <span className={`tiny-dot ${isConnected ? 'online' : 'offline'}`} />
        </button>

        {/* Sidebar Bottom / Help Card & User Profile */}
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <Database size={18} />
            </div>
            <b>Firebase Cloud Storage</b>
            <p>
              {user
                ? `Logged in: ${user.email?.slice(0, 18)}... Readings saving to Firestore.`
                : 'Sign in to persist sensor telemetry to the cloud database.'}
            </p>
            {user ? (
              <button onClick={handleGoogleLogout}>
                Sign out <span>→</span>
              </button>
            ) : (
              <button onClick={handleGoogleLogin}>
                Sign in with Google <span>↗</span>
              </button>
            )}
          </div>

          <div className="profile">
            <div className="avatar">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <b>{user?.displayName || 'Shivani'}</b>
              <span>{user?.email || 'Project admin'}</span>
            </div>
            {user ? (
              <button
                className="icon-btn"
                title="Sign out"
                onClick={handleGoogleLogout}
              >
                <LogOut size={16} />
              </button>
            ) : (
              <button
                className="icon-btn"
                title="Sign in with Google"
                onClick={handleGoogleLogin}
              >
                <LogIn size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {mobileNav && (
        <div className="scrim" onClick={() => setMobileNav(false)} />
      )}

      {/* Main Content Area */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="top-left">
            <button
              className="icon-btn menu-btn"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span> <b>{page}</b>
            </div>
          </div>

          <div className="top-actions">
            {/* Cloud Sync Status */}
            <div
              className={`cloud-pill ${user && isCloudSyncActive ? 'synced' : ''}`}
              title="Firebase Firestore Synchronization"
            >
              <Database size={14} />
              <span>{user ? 'Firestore Synced' : 'Cloud Sync (Guest)'}</span>
            </div>

            {/* Hardware Connection Pill */}
            <div
              className={`connection-pill ${isConnected ? 'is-connected' : ''}`}
              onClick={() => setPage('Devices')}
              style={{ cursor: 'pointer' }}
            >
              <span className={`tiny-dot ${isConnected ? 'online' : 'offline'}`} />
              {isSimulating
                ? 'Simulator Active'
                : isConnected
                ? 'Arduino USB Live'
                : 'Hardware Standby'}
            </div>

            {/* Auth Button */}
            {user ? (
              <button
                className="auth-btn"
                onClick={handleGoogleLogout}
                title="Sign out of Google"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                className="auth-btn"
                onClick={handleGoogleLogin}
                title="Sign in with Google"
              >
                <LogIn size={14} />
                <span>Sign in</span>
              </button>
            )}

            <div className="top-avatar">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'S'}
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="page-wrap">
          {/* Header */}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" /> SMART FARM MONITORING & ANALYTICS
              </div>
              <h1>{page}</h1>
              <p>{subtitle}</p>
            </div>

            <div className="heading-actions">
              <div className="date-chip">
                <CloudSun size={17} />
                <span>Today, {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <ChevronDown size={14} />
              </div>
              <button className="btn btn-primary" onClick={downloadCSV}>
                <Download size={16} /> Export report
              </button>
            </div>
          </div>

          {/* Alert banner if bridge is not connected */}
          {bridgeError && !isSimulating && (
            <div className="alert-box" style={{ marginBottom: 18 }}>
              <AlertTriangle size={18} />
              <div>
                <b>Arduino Bridge Offline</b>
                <p>
                  {bridgeError} You can run <code>node server/index.js</code> locally or click{' '}
                  <button
                    onClick={toggleSimulator}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#287a4d',
                      textDecoration: 'underline',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Simulate Arduino feed
                  </button>{' '}
                  to test full live analytics immediately!
                </p>
              </div>
            </div>
          )}

          {/* Subpage Rendering */}
          {page === 'Overview' && (
            <Overview
              data={data}
              readings={readings}
              events={events}
              autoIrrigation={autoIrrigation}
              lightAuto={lightAuto}
              pump={pump}
              threshold={threshold}
              binThreshold={binThreshold}
              connected={isConnected}
              range={range}
              setRange={setRange}
              setPage={setPage}
              notify={notify}
            />
          )}

          {page === 'Irrigation' && (
            <Irrigation
              data={data}
              readings={readings}
              pump={pump}
              togglePump={togglePump}
              autoIrrigation={autoIrrigation}
              setAutoIrrigation={updateAutoIrrigation}
              threshold={threshold}
              setThreshold={updateThreshold}
              notify={notify}
            />
          )}

          {page === 'Streetlights' && (
            <Streetlights
              data={data}
              lightAuto={lightAuto}
              setLightAuto={updateLightAuto}
              notify={notify}
            />
          )}

          {page === 'Smart dustbin' && (
            <Dustbin
              data={data}
              binThreshold={binThreshold}
              notify={notify}
              onMarkCollection={handleMarkCollection}
            />
          )}

          {page === 'Analytics & reports' && (
            <Analytics
              readings={readings}
              range={range}
              setRange={setRange}
              downloadCSV={downloadCSV}
              notify={notify}
            />
          )}

          {page === 'Activity & alerts' && (
            <ActivityAlerts
              events={events}
              onClearEvents={() => {
                clearUserEvents(events);
                setEvents([]);
                notify('Event list cleared');
              }}
              notify={notify}
            />
          )}

          {page === 'Devices' && (
            <Devices
              data={data}
              socketConnected={socketConnected}
              bridgeUrl={bridgeUrl}
              setBridgeUrl={setBridgeUrl}
              reconnectBridge={connectSocket}
              isSimulating={isSimulating}
              toggleSimulator={toggleSimulator}
              serialLogs={serialLogs}
              clearSerialLogs={() => setSerialLogs([])}
              isCloudSyncActive={isCloudSyncActive}
              toggleCloudSync={() => {
                setIsCloudSyncActive(!isCloudSyncActive);
                notify(`Cloud Firestore save ${!isCloudSyncActive ? 'enabled' : 'paused'}`);
              }}
              notify={notify}
            />
          )}

          {/* Footer */}
          <footer className="footer">
            <span>© 2026 SmartAgri Control Center · Automated Precision Agriculture</span>
            <span>
              <span className={`tiny-dot ${isConnected ? 'online' : 'offline'}`} />
              {isConnected ? 'Hardware Live & Streaming' : 'Bridge Standby'}
              <span className="footer-sep">·</span>
              Firestore Cloud Database Configured
            </span>
          </footer>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
          <button onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
