import React from 'react';
import { PlaceCategory } from '../api/types';
import { CATEGORY_OPTIONS } from '../constants/categories';
import { Chip } from './Chip';
import { ChipRow } from './ChipRow';

/**
 * 카테고리 필터. null은 "전체"다.
 *
 * 지역·키워드와 달리 고른 것을 다시 누르면 해제된다. 좁혀 보다가 전체로
 * 돌아오는 동작이 잦은데, "전체" 칩까지 가서 누르게 하면 한 번이 더 든다.
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: PlaceCategory | null;
  onChange: (category: PlaceCategory | null) => void;
}) {
  return (
    <ChipRow>
      <Chip
        label="전체"
        selected={value === null}
        onPress={() => onChange(null)}
      />
      {CATEGORY_OPTIONS.map(option => (
        <Chip
          key={option.code}
          label={option.label}
          selected={option.code === value}
          onPress={() => onChange(option.code === value ? null : option.code)}
        />
      ))}
    </ChipRow>
  );
}
