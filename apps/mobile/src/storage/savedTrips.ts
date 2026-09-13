import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScheduleDay } from '../api/types';

const STORAGE_KEY = '@planit/saved-trips:v1';
const MAX_SAVED_TRIPS = 30;

export interface SavedTrip {
  id: string;
  savedAt: string;
  regionLabel: string;
  days: ScheduleDay[];
}

export interface SaveTripInput {
  regionLabel: string;
  days: ScheduleDay[];
}

export async function listSavedTrips(): Promise<SavedTrip[]> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedTrip).sort((a, b) =>
      b.savedAt.localeCompare(a.savedAt),
    );
  } catch {
    return [];
  }
}

export async function saveTrip(input: SaveTripInput): Promise<SavedTrip> {
  const savedAt = new Date().toISOString();
  const trip: SavedTrip = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt,
    regionLabel: input.regionLabel,
    days: input.days,
  };
  const current = await listSavedTrips();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([trip, ...current].slice(0, MAX_SAVED_TRIPS)),
  );
  return trip;
}

function isSavedTrip(value: unknown): value is SavedTrip {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SavedTrip>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.savedAt === 'string' &&
    typeof candidate.regionLabel === 'string' &&
    Array.isArray(candidate.days)
  );
}
