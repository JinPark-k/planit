import { toDayStartOverrides } from './schedule.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';

function dto(partial: Partial<GenerateScheduleDto> = {}): GenerateScheduleDto {
  return {
    keywords: [],
    region: 'JEJU',
    dayCount: 2,
    travelMode: 'CAR',
    ...partial,
  };
}

describe('toDayStartOverrides', () => {
  // API 표면은 배열, core는 일차 번호 맵을 쓴다.
  // 숫자 키 맵은 class-validator 중첩 검증도 Swagger 스키마 표현도 안 되기 때문이다.
  it('배열을 일차 번호 맵으로 바꾼다', () => {
    const result = toDayStartOverrides(
      dto({
        dayStarts: [
          { day: 1, location: { lat: 33.4996, lng: 126.5312 }, time: '10:30' },
          { day: 2, time: '09:30' },
        ],
      }),
    );
    expect(result).toEqual({
      1: { location: { lat: 33.4996, lng: 126.5312 }, time: '10:30' },
      2: { location: undefined, time: '09:30' },
    });
  });

  it('지정 안 한 일차는 맵에 넣지 않는다 (core가 기본값을 쓰도록)', () => {
    const result = toDayStartOverrides(dto({ dayStarts: [{ day: 2 }] }));
    expect(Object.keys(result ?? {})).toEqual(['2']);
  });

  it('dayStarts가 없거나 비면 undefined를 반환한다', () => {
    expect(toDayStartOverrides(dto())).toBeUndefined();
    expect(toDayStartOverrides(dto({ dayStarts: [] }))).toBeUndefined();
  });
});
