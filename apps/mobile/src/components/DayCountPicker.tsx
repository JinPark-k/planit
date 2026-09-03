import React from 'react';
import { Chip } from './Chip';
import { ChipRow } from './ChipRow';

/** 고를 수 있는 여행 일수. 백엔드는 15일까지 받지만 화면에서는 5일까지만 노출한다. */
export const DAY_COUNT_OPTIONS = [1, 2, 3, 4, 5];

export function DayCountPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (dayCount: number) => void;
}) {
  return (
    <ChipRow>
      {DAY_COUNT_OPTIONS.map(option => (
        <Chip
          key={option}
          label={`${option}일`}
          selected={option === value}
          onPress={() => onChange(option)}
        />
      ))}
    </ChipRow>
  );
}
