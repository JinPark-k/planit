import { useCallback, useState } from 'react';
import type { ScheduleDay } from '../api/types';
import { saveTrip } from '../storage/savedTrips';

export type TripSaveState = 'idle' | 'saving' | 'saved';

export function useTripSave(days: ScheduleDay[], regionLabel: string) {
  const [saveState, setSaveState] = useState<TripSaveState>('idle');
  const [saveError, setSaveError] = useState<string | undefined>();

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    setSaveError(undefined);

    try {
      await saveTrip({ days, regionLabel });
      setSaveState('saved');
    } catch {
      setSaveState('idle');
      setSaveError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [days, regionLabel]);

  return { handleSave, saveState, saveError };
}
