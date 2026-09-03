import React from 'react';
import { RegionCode } from '../api/types';
import { REGION_OPTIONS } from '../constants/regions';
import { Chip } from './Chip';
import { ChipRow } from './ChipRow';

export function RegionPicker({
  value,
  onChange,
}: {
  value: RegionCode | null;
  onChange: (region: RegionCode) => void;
}) {
  return (
    <ChipRow>
      {REGION_OPTIONS.map(option => (
        <Chip
          key={option.code}
          label={option.label}
          selected={option.code === value}
          onPress={() => onChange(option.code)}
        />
      ))}
    </ChipRow>
  );
}
