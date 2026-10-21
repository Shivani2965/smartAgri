import express from "express";
import cors from "cors";
import http from "node:http";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Allow connections from React frontend
app.use(cors({ origin: "*" }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*" },
});

const SERIAL_PORT = process.env.SERIAL_PORT || "COM5"; // Change to your Arduino USB COM port (e.g. COM3, COM5, or /dev/ttyUSB0)
const BAUD_RATE = 9600;
const PORT = process.env.PORT || 3001;

const state = {
  connected: false,
  distanceCm: null,
  soilMoistureRaw: null,
  pump: "Unknown",
  ldrRaw: null,
  streetlight: "Unknown",
  lid: "Unknown",
  lastMessageAt: null,
  lastLine: "",
};

function publishState() {
  io.emit("telemetry", { ...state });
}

function handleLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return;

  state.lastLine = line;
  console.log("[Arduino]", line);

  let match;

  match = line.match(/^Dustbin Distance:\s*([\d.]+)\s*cm/i);
  if (match) {
    const distance = Number(match[1]);
    state.distanceCm = distance > 0 ? distance : null;
  }

  match = line.match(/^Soil Moisture:\s*(\d+)/i);
  if (match) state.soilMoistureRaw = Number(match[1]);

  match = line.match(/^Pump:\s*(ON|OFF)\s*$/i);
  if (match) state.pump = match[1].toUpperCase();

  match = line.match(/^LDR Reading:\s*(\d+)/i);
  if (match) state.ldrRaw = Number(match[1]);

  if (/^Street Light:\s*DARK\s*-\s*ON/i.test(line)) {
    state.streetlight = "ON";
  } else if (/^Street Light:\s*BRIGHT\s*-\s*OFF/i.test(line)) {
    state.streetlight = "OFF";
  }

  if (/^Dustbin: Object detected/i.test(line)) {
    state.lid = "Object detected";
  }

  if (/^-{5,}$/.test(line)) {
    state.lastMessageAt = new Date().toISOString();
    publishState();
  }
}

function startSerial() {
  try {
    const serial = new SerialPort({
      path: SERIAL_PORT,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    const parser = serial.pipe(
      new ReadlineParser({ delimiter: "\n" })
    );

    parser.on("data", handleLine);

    serial.on("open", () => {
      state.connected = true;
      console.log(`Arduino connected on ${SERIAL_PORT}`);
      publishState();
    });

    serial.on("close", () => {
      state.connected = false;
      console.log("Serial port closed.");
      publishState();
    });

    serial.on("error", (error) => {
      state.connected = false;
      console.error("Serial error:", error.message);
      publishState();
    });

    serial.open((error) => {
      if (error) {
        console.error(`Cannot open ${SERIAL_PORT}: ${error.message}`);
        console.error("Make sure PuTTY and Arduino IDE Serial Monitor are closed, then verify COM port.");
      }
    });
  } catch (err) {
    console.error("Error setting up serial port:", err.message);
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    server: "running",
    serialPort: SERIAL_PORT,
    connected: state.connected,
    lastMessageAt: state.lastMessageAt,
  });
});

app.get("/api/telemetry", (req, res) => {
  res.json(state);
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("telemetry", state);
});

server.listen(PORT, () => {
  console.log(`Bridge running at http://localhost:${PORT}`);
  startSerial();
});
