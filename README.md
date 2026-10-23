# 🌱 SmartAgri Control Center

> **Production-ready IoT Dashboard, Real-Time Hardware Bridge & Firebase Cloud Analytics for Arduino Smart Agriculture**

SmartAgri Control Center connects physical Arduino sensors (soil moisture, LDR light, HC-SR04 ultrasonic distance, PIR motion, and relays) to a responsive React dashboard, streaming live telemetry through a local Node.js bridge into a secure **Firebase Cloud Firestore** database for historical analytics and automation.

---

## 📸 Modules & Features

### 1. 💧 Smart Irrigation & Soil Health
- **Live Soil Moisture Monitoring**: Displays both raw analog input (`0–1023`) and calibrated soil moisture percentage (`0–100%`).
- **Automated Irrigation Logic**: Triggers water pump relay whenever moisture drops below the customizable threshold slider (e.g. 30%).
- **Manual Relay Override**: Instant Start/Stop pump relay control with activity event logging.
- **Historical Moisture Trend Chart**: Real-time Area Chart plotting soil hydration over time.

### 2. 💡 Smart Streetlights & Perimeter Lighting
- **LDR Ambient Light Detection**: Tracks daylight and dusk conditions from analog photocell readings.
- **PIR Motion Events**: Logs motion activations along farm lanes.
- **Automated Dusk-to-Dawn Control**: Turns LED/relay on when ambient light drops or motion is sensed.
- **Weekly Activation Distribution**: Bar chart comparing lighting events and energy duration.

### 3. 🗑️ Smart Dustbin & Waste Monitoring
- **Ultrasonic Fill Calculation**: Computes container waste capacity from HC-SR04 distance measurements (`Fill % = (BinHeight - Distance) / BinHeight * 100`).
- **Animated 3D Visual Bin**: Lid animates dynamically when objects or hands approach, and fill level raises in real time.
- **Collection Threshold Alarms**: Visual alerts and notifications when fill level reaches ≥80%.
- **One-Click Servicing**: "Mark as collected" action resets bin capacity and logs maintenance.

### 4. 📊 Cloud Analytics & CSV Reporting
- **Persistent Firestore Storage**: All readings (`distanceCm`, `soilMoistureRaw`, `soilMoisturePct`, `pump`, `ldrRaw`, `streetlight`, `lid`, `timestamp`) are automatically saved to Firebase Cloud Firestore.
- **Aggregated Telemetry Metrics**: Min, Max, and Average moisture, pump active duration, streetlight activations, and alert counts.
- **Timeframe Filtering**: Filter trends across *Today*, *7 days*, and *30 days*.
- **Live Data Table**: Chronological table of actual sensor data entries.
- **CSV Data Export**: One-click download of the real recorded sensor dataset for external reporting and spreadsheets.

### 5. 🔔 Activity & Alert Feed
- Chronological feed of automated system notifications, hardware connection events, and threshold alerts.
- Filterable by module (*Irrigation*, *Streetlights*, *Dustbin*, *System*).

### 6. 🔌 Devices, Serial Monitor & Simulator
- **Live Arduino Serial Monitor**: Embedded terminal console showing raw UART frames printed by the sketch.
- **Customizable Bridge Endpoint**: Default `http://localhost:3001` with quick reconnect button.
- **Built-in Hardware Simulator**: Test the entire application, charts, alerts, and Firestore writes immediately in your browser without requiring physical hardware!

---

## 🏗️ Architecture

```text
 ┌─────────────────┐           USB Serial UART            ┌────────────────────────┐
 │   Arduino UNO   │ ───────────────────────────────────> │  Node.js Serial Bridge │
 │ (Sensors/Relays)│             (9600 Baud)              │   (server/index.js)    │
 └─────────────────┘                                      └───────────┬────────────┘
                                                                      │ Socket.io (:3001)
                                                                      v
 ┌───────────────────────────┐    Firestore Real-Time SDK  ┌────────────────────────┐
 │  Firebase Cloud Firestore │ <────────────────────────── │  React Vite Dashboard  │
 │ (telemetry_readings, etc.)│                             │       (Port 3000)      │
 └───────────────────────────┘                             └────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Automated Setup
Clone the repository and run the setup script for your operating system:

- **Linux / macOS / WSL**:
  ```bash
  ./setup.sh
  ```
- **Windows**:
  ```cmd
  setup.bat
  ```

### 2. Manual Setup
```bash
# 1. Install frontend dependencies
npm install

# 2. Install server bridge dependencies
cd server
npm install
cd ..
```

---

## ⚡ Running the System

Open two terminals:

### Terminal 1: Start the Local Arduino Serial Bridge
```bash
# Default COM port is COM5 (or set SERIAL_PORT env variable)
npm run bridge
```

### Terminal 2: Start the Web Dashboard
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

> 💡 **No Arduino plugged in right now?** Click the **"Simulate Arduino feed"** button on the **Devices & connection** page to test live charts, alarms, and cloud saving immediately!

---

## 📡 Arduino Serial UART Protocol

The local bridge (`server/index.js`) listens on **9600 Baud** and parses the following newline-delimited text frames:

```text
Dustbin Distance: 18.5 cm
Soil Moisture: 480
Pump: OFF
LDR Reading: 620
Street Light: BRIGHT - OFF
Dustbin: Object detected
-----
```

- Each measurement is identified by its prefix.
- The `-----` delimiter signals the completion of a full sensor scan cycle, triggering a `telemetry` WebSocket broadcast to the React dashboard.

A ready-to-flash Arduino sketch (`SmartAgri.ino`) and complete circuit pinout diagram are provided in [SETUP.md](./SETUP.md).

---

## ☁️ Firebase Firestore Schema

The application uses Google Firebase with Attribute-Based Access Control:

| Collection Path | Purpose | Key Attributes |
| :--- | :--- | :--- |
| `/telemetry_readings/{readingId}` | Immutable time-series sensor log | `userId`, `distanceCm`, `soilMoistureRaw`, `soilMoisturePct`, `pump`, `ldrRaw`, `streetlight`, `lid`, `timestamp` |
| `/alerts_and_events/{eventId}` | System alerts and threshold logs | `userId`, `title`, `detail`, `module`, `type`, `color`, `timestamp` |
| `/system_settings/{userId}` | User farm automation thresholds | `userId`, `moistureThreshold`, `autoIrrigation`, `autoLighting`, `binAlertThreshold` |

Security rules in `firestore.rules` enforce request authentication and schema boundaries to guarantee isolation across farm owners.

---

## 📂 Project Structure

```text
smartagri-control-center/
├── .env.example              # Environment variables template
├── .gitignore                # Production git ignore definitions
├── README.md                 # Project overview and documentation
├── SETUP.md                  # Hardware wiring guide and Arduino sketch
├── setup.sh                  # Automated setup script (Linux/macOS)
├── setup.bat                 # Automated setup script (Windows)
├── firebase-applet-config.json # Firebase connection configuration
├── firebase-blueprint.json   # Intermediate representation schema
├── firestore.rules           # Hardened security rules
├── package.json              # Root dependencies & npm scripts
├── server/
│   ├── index.js              # Node.js SerialPort & Socket.io bridge
│   └── package.json          # Bridge server dependencies
└── src/
    ├── App.tsx               # Main dashboard shell & routing
    ├── firebase.ts           # Firebase SDK initialization & auth helpers
    ├── styles.css            # Custom responsive design system
    ├── types.ts              # TypeScript interface definitions
    ├── components/
    │   ├── Overview.tsx      # Farm KPI cards, welcome banner & charts
    │   ├── Irrigation.tsx    # Soil moisture, threshold slider & pump control
    │   ├── Streetlights.tsx  # LDR photocell readings & dusk control
    │   ├── Dustbin.tsx       # Animated 3D dustbin with ultrasonic fill meter
    │   ├── Analytics.tsx     # Historical reports, data table & CSV exporter
    │   ├── ActivityAlerts.tsx# System notification log & rule summaries
    │   └── Devices.tsx       # Serial monitor terminal & bridge settings
    └── services/
        └── telemetryService.ts # Firestore CRUD, subscriptions & conversions
```

---

## 📄 License
This project is licensed under the Apache 2.0 License.
