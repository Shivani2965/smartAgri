export interface HardwareState {
  connected: boolean;
  distanceCm: number | null;
  soilMoistureRaw: number | null;
  soilMoisturePct?: number | null;
  pump: string; // "ON", "OFF", "Unknown"
  ldrRaw: number | null;
  streetlight: string; // "ON", "OFF", "Unknown"
  lid: string; // "Object detected", "Closed", etc.
  lastMessageAt: string | null;
  lastLine: string;
  source?: 'hardware' | 'simulator' | 'cloud';
}

export interface SerialLogItem {
  id: string;
  timestamp: string;
  text: string;
}
