import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface TelemetryReading {
  id?: string;
  userId: string;
  distanceCm: number | null;
  soilMoistureRaw: number | null;
  soilMoisturePct: number | null;
  pump: string;
  ldrRaw: number | null;
  streetlight: string;
  lid: string;
  rawLine: string;
  timestamp: string;
  createdAt?: string;
}

export interface AlertEvent {
  id?: string;
  userId: string;
  title: string;
  detail: string;
  module: 'irrigation' | 'streetlight' | 'dustbin' | 'system';
  type: 'System' | 'Warning' | 'Alert' | 'Info';
  color: 'blue' | 'green' | 'orange' | 'amber';
  timestamp: string;
  createdAt?: string;
}

export interface SystemSettings {
  userId: string;
  moistureThreshold: number; // e.g. 30 (%)
  autoIrrigation: boolean;
  autoLighting: boolean;
  binAlertThreshold: number; // e.g. 80 (%)
  updatedAt?: string;
}

export const DEFAULT_SETTINGS: Omit<SystemSettings, 'userId'> = {
  moistureThreshold: 30,
  autoIrrigation: true,
  autoLighting: true,
  binAlertThreshold: 80,
};

/**
 * Calculates Soil Moisture % from raw Arduino analog input (0 - 1023).
 * Typically, 1023 is bone dry air, 250-350 is soaked in water.
 */
export function calculateSoilMoisturePct(raw: number | null): number | null {
  if (raw === null || isNaN(raw)) return null;
  // If raw is already a percentage (0-100)
  if (raw <= 100) return Math.round(raw);
  const dryVal = 1023;
  const wetVal = 300;
  const pct = Math.round(((dryVal - raw) / (dryVal - wetVal)) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Calculates Dustbin Fill % based on distance in cm.
 * Assuming a standard 25cm tall desktop/model bin or custom container.
 */
export function calculateBinFillPct(distanceCm: number | null, binHeightCm = 25): number {
  if (distanceCm === null || isNaN(distanceCm) || distanceCm <= 0) return 0;
  if (distanceCm >= binHeightCm) return 5;
  const fill = Math.round(((binHeightCm - distanceCm) / binHeightCm) * 100);
  return Math.max(0, Math.min(100, fill));
}

/**
 * Save a telemetry reading to Firestore for the current user.
 */
export async function saveTelemetryReading(
  reading: Omit<TelemetryReading, 'userId' | 'id'>
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be signed in to save telemetry to Firestore');
  }

  const readingId = `read_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `telemetry_readings/${readingId}`;

  const payload: TelemetryReading = {
    userId: user.uid,
    distanceCm: reading.distanceCm ?? null,
    soilMoistureRaw: reading.soilMoistureRaw ?? null,
    soilMoisturePct: reading.soilMoisturePct ?? calculateSoilMoisturePct(reading.soilMoistureRaw),
    pump: reading.pump || 'Unknown',
    ldrRaw: reading.ldrRaw ?? null,
    streetlight: reading.streetlight || 'Unknown',
    lid: reading.lid || 'Unknown',
    rawLine: (reading.rawLine || '').slice(0, 500),
    timestamp: reading.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'telemetry_readings', readingId), payload);
    return readingId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Subscribe to recent telemetry readings for the signed-in user.
 */
export function subscribeToTelemetry(
  limitCount = 60,
  onData: (readings: TelemetryReading[]) => void
): Unsubscribe {
  const user = auth.currentUser;
  if (!user) {
    onData([]);
    return () => {};
  }

  const path = 'telemetry_readings';
  const q = query(
    collection(db, path),
    where('userId', '==', user.uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const readings: TelemetryReading[] = [];
      snapshot.forEach((d) => {
        readings.push({ id: d.id, ...(d.data() as TelemetryReading) });
      });
      onData(readings);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Save an alert or activity event to Firestore.
 */
export async function saveAlertEvent(
  event: Omit<AlertEvent, 'userId' | 'id'>
): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';

  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `alerts_and_events/${eventId}`;

  const payload: AlertEvent = {
    userId: user.uid,
    title: event.title.slice(0, 120),
    detail: event.detail.slice(0, 250),
    module: event.module,
    type: event.type,
    color: event.color,
    timestamp: event.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'alerts_and_events', eventId), payload);
    return eventId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Subscribe to alert events for the signed-in user.
 */
export function subscribeToEvents(
  limitCount = 30,
  onData: (events: AlertEvent[]) => void
): Unsubscribe {
  const user = auth.currentUser;
  if (!user) {
    onData([]);
    return () => {};
  }

  const path = 'alerts_and_events';
  const q = query(
    collection(db, path),
    where('userId', '==', user.uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events: AlertEvent[] = [];
      snapshot.forEach((d) => {
        events.push({ id: d.id, ...(d.data() as AlertEvent) });
      });
      onData(events);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Load system settings for the current user.
 */
export async function getSystemSettings(): Promise<SystemSettings | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `system_settings/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'system_settings', user.uid));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Save or update system settings for the current user.
 */
export async function saveSystemSettings(
  settings: Partial<Omit<SystemSettings, 'userId'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `system_settings/${user.uid}`;
  const payload: SystemSettings = {
    userId: user.uid,
    moistureThreshold: settings.moistureThreshold ?? DEFAULT_SETTINGS.moistureThreshold,
    autoIrrigation: settings.autoIrrigation ?? DEFAULT_SETTINGS.autoIrrigation,
    autoLighting: settings.autoLighting ?? DEFAULT_SETTINGS.autoLighting,
    binAlertThreshold: settings.binAlertThreshold ?? DEFAULT_SETTINGS.binAlertThreshold,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'system_settings', user.uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Clear recent alert events for the user.
 */
export async function clearUserEvents(events: AlertEvent[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  for (const e of events) {
    if (e.id) {
      try {
        await deleteDoc(doc(db, 'alerts_and_events', e.id));
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
  }
}
