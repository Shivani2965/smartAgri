# 🛠️ SmartAgri Hardware & Software Setup Guide

This guide walks you through connecting your physical Arduino UNO to the **SmartAgri Control Center**, configuring the local Node.js serial bridge, and testing live sensor telemetry.

---

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Hardware Components Required](#hardware-components-required)
3. [Pinout & Circuit Wiring](#pinout--circuit-wiring)
4. [Arduino Sketch Code (`SmartAgri.ino`)](#arduino-sketch-code)
5. [Software Setup & Installation](#software-setup--installation)
6. [Configuring the Serial Bridge](#configuring-the-serial-bridge)
7. [Running the Application](#running-the-application)
8. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 1. System Architecture

```text
┌─────────────────┐       USB / HC-05 UART      ┌─────────────────────────┐
│   Arduino UNO   │  ─────────────────────────> │ Node.js Serial Bridge   │
│ (Sensors/Relays)│       (9600 Baud)           │    (server/index.js)    │
└─────────────────┘                             └────────────┬────────────┘
                                                             │ Socket.io (Port 3001)
                                                             v
┌─────────────────────────┐   Firestore SDK (REST/WS)   ┌─────────────────────────┐
│ Firebase Cloud Database │ <────────────────────────── │ React Frontend Dashboard│
│   (Persistent Storage)  │                             │   (Vite / Port 3000)    │
└─────────────────────────┘                             └─────────────────────────┘
```

---

## 2. Hardware Components Required

- **Arduino UNO R3** (or compatible board: Nano, Mega, ESP32)
- **Soil Moisture Sensor** (Capacitive or Resistive analog sensor)
- **HC-SR04 Ultrasonic Distance Sensor** (For dustbin fill level)
- **LDR (Light Dependent Resistor / Photoresistor)** + 10kΩ pull-down resistor
- **PIR Motion Sensor** (or HC-SR501)
- **5V Relay Module** (Active LOW or HIGH, controls water pump / solenoid valve)
- **5V Mini Submersible Water Pump** + tubing
- **LEDs** (For streetlights and status indicators)
- **Jumper wires & Breadboard**
- **USB Cable Type A-to-B** (or HC-05 Bluetooth Classic module)

---

## 3. Pinout & Circuit Wiring

| Component | Arduino Pin | Notes |
| :--- | :--- | :--- |
| **Soil Moisture Sensor** (Signal/AO) | `A0` | Analog input (0–1023) |
| **LDR Light Sensor** (Signal/AO) | `A1` | 10kΩ voltage divider to GND |
| **HC-SR04 Ultrasonic Trigger** | `Pin 9` | Digital output |
| **HC-SR04 Ultrasonic Echo** | `Pin 10` | Digital input |
| **PIR Motion Sensor** (Signal) | `Pin 2` | Digital input |
| **Water Pump Relay Module** (IN) | `Pin 7` | Digital output |
| **Streetlight Relay / LED** | `Pin 8` | Digital output |
| **Servo Motor (Optional Lid)** | `Pin 6` | PWM signal for opening lid |
| **Power (VCC)** | `5V` | Sensor power rail |
| **Ground (GND)** | `GND` | Common ground rail |

---

## 4. Arduino Sketch Code (`SmartAgri.ino`)

Upload the following sketch using the **Arduino IDE**:

```cpp
/*
 * SmartAgri - Automated Sensor Node Sketch
 * Matches the exact UART framing expected by server/index.js
 * Baud Rate: 9600
 */

#define SOIL_PIN A0
#define LDR_PIN A1
#define TRIG_PIN 9
#define ECHO_PIN 10
#define PIR_PIN 2
#define PUMP_RELAY_PIN 7
#define LIGHT_RELAY_PIN 8

const int MOISTURE_THRESHOLD = 500; // Raw analog: dry > 500, wet < 400
const int LDR_THRESHOLD = 450;      // Dark < 450, bright > 500
const int BIN_HEIGHT_CM = 25;       // Height of dustbin in cm

void setup() {
  Serial.begin(9600);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(LIGHT_RELAY_PIN, OUTPUT);

  digitalWrite(PUMP_RELAY_PIN, LOW);
  digitalWrite(LIGHT_RELAY_PIN, LOW);

  delay(1000);
}

float measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 25.0; // Default max distance
  return (duration * 0.0343) / 2.0;
}

void loop() {
  // 1. Read Soil Moisture
  int soilMoistureRaw = analogRead(SOIL_PIN);
  bool pumpActive = (soilMoistureRaw > MOISTURE_THRESHOLD); // If dry, turn ON pump
  digitalWrite(PUMP_RELAY_PIN, pumpActive ? HIGH : LOW);

  // 2. Read LDR & Motion for Streetlight
  int ldrReading = analogRead(LDR_PIN);
  int motionDetected = digitalRead(PIR_PIN);
  bool isDark = (ldrReading < LDR_THRESHOLD);
  bool lightActive = isDark || (motionDetected == HIGH);
  digitalWrite(LIGHT_RELAY_PIN, lightActive ? HIGH : LOW);

  // 3. Read Ultrasonic Distance for Dustbin
  float distanceCm = measureDistanceCm();
  bool objectDetected = (distanceCm < 8.0);

  // --- Emit Formatted Frame to Serial UART ---
  Serial.print("Dustbin Distance: ");
  Serial.print(distanceCm, 1);
  Serial.println(" cm");

  Serial.print("Soil Moisture: ");
  Serial.println(soilMoistureRaw);

  Serial.print("Pump: ");
  Serial.println(pumpActive ? "ON" : "OFF");

  Serial.print("LDR Reading: ");
  Serial.println(ldrReading);

  Serial.print("Street Light: ");
  Serial.println(isDark ? "DARK - ON" : "BRIGHT - OFF");

  if (objectDetected) {
    Serial.println("Dustbin: Object detected");
  }

  // End of frame delimiter
  Serial.println("-----");

  delay(2000); // Send telemetry every 2 seconds
}
```

---

## 5. Software Setup & Installation

### Option A: Using the Automated Setup Script

- **Linux / macOS / WSL**:
  ```bash
  ./setup.sh
  ```
- **Windows (Command Prompt / PowerShell)**:
  ```cmd
  setup.bat
  ```

### Option B: Manual Setup

1. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```
2. **Install Server Bridge Dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

---

## 6. Configuring the Serial Bridge

1. Open `server/index.js`.
2. Locate the serial port configuration line:
   ```javascript
   const SERIAL_PORT = process.env.SERIAL_PORT || "COM5";
   ```
   - **Windows**: Check Device Manager -> Ports (COM & LPT) to find your COM port (e.g. `COM3`, `COM4`, `COM5`).
   - **macOS**: Check Terminal: `ls /dev/cu.usbmodem*` (e.g. `/dev/cu.usbmodem14101`).
   - **Linux**: Check Terminal: `ls /dev/ttyACM*` or `ls /dev/ttyUSB*`.
3. You can also specify the port without editing files via environment variables:
   ```bash
   # On Windows PowerShell
   $env:SERIAL_PORT="COM3"; npm run bridge

   # On Linux/macOS
   SERIAL_PORT=/dev/ttyACM0 npm run bridge
   ```

> ⚠️ **Important**: Ensure the **Arduino IDE Serial Monitor** or PuTTY is **CLOSED** before starting the bridge. Only one program can access the COM port at a time.

---

## 7. Running the Application

Open two terminal windows:

### Terminal 1: Run Serial Bridge
```bash
npm run bridge
```
Output:
```text
Bridge running at http://localhost:3001
Arduino connected on COM5
[Arduino] Dustbin Distance: 18.2 cm
[Arduino] Soil Moisture: 480
[Arduino] Pump: OFF
[Arduino] LDR Reading: 610
[Arduino] Street Light: BRIGHT - OFF
[Arduino] -----
```

### Terminal 2: Run Web Dashboard
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 8. Testing & Troubleshooting

### 1. No hardware plugged in yet?
In the dashboard:
- Navigate to **Devices & connection**.
- Click **"Simulate Arduino feed"**.
- The simulator will generate real-time UART frames, update charts, test threshold automation, and write readings to Firebase!

### 2. "Cannot open COM port: Access Denied"
- Close the Arduino IDE Serial Monitor.
- Close any PuTTY or terminal windows holding the serial connection.
- Unplug and reconnect the USB cable.

### 3. Firebase Cloud Storage
- Click **"Sign in with Google"** in the topbar or sidebar.
- Live readings from your Arduino or simulator will automatically save to Firestore under `/telemetry_readings`.
- Download your real historical dataset anytime via the **"Export CSV"** button on the Analytics page.
