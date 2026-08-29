import { TtlCache } from './ttl-cache';

/** 테스트에서 시계를 직접 돌린다. 실제 시간에 의존하면 느리고 불안정해진다. */
function fakeClock(start = 1_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe('TtlCache', () => {
  it('넣은 값을 그대로 돌려준다', () => {
    const cache = new TtlCache<number>({ ttlMs: 100, maxEntries: 4 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('없는 키는 undefined다', () => {
    const cache = new TtlCache<number>({ ttlMs: 100, maxEntries: 4 });
    expect(cache.get('nope')).toBeUndefined();
  });

  it('TTL이 지나면 만료된다', () => {
    const clock = fakeClock();
    const cache = new TtlCache<number>({
      ttlMs: 100,
      maxEntries: 4,
      now: clock.now,
    });
    cache.set('a', 1);

    clock.advance(99);
    expect(cache.get('a')).toBe(1);

    clock.advance(1); // 정확히 TTL 시점
    expect(cache.get('a')).toBeUndefined();
  });

  it('만료된 항목은 조회 시 정리된다 (메모리 누수 방지)', () => {
    const clock = fakeClock();
    const cache = new TtlCache<number>({
      ttlMs: 100,
      maxEntries: 4,
      now: clock.now,
    });
    cache.set('a', 1);
    clock.advance(200);

    expect(cache.size).toBe(1);
    cache.get('a');
    expect(cache.size).toBe(0);
  });

  it('상한을 넘으면 가장 오래된 항목부터 버린다', () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('같은 키를 덮어써도 항목 수가 늘지 않고 가장 최근으로 취급된다', () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // a를 갱신 -> 이제 b가 가장 오래된 항목
    cache.set('c', 3);

    expect(cache.size).toBe(2);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(10);
    expect(cache.get('c')).toBe(3);
  });

  it('덮어쓰면 TTL도 다시 시작한다', () => {
    const clock = fakeClock();
    const cache = new TtlCache<number>({
      ttlMs: 100,
      maxEntries: 4,
      now: clock.now,
    });
    cache.set('a', 1);
    clock.advance(80);
    cache.set('a', 2);
    clock.advance(80); // 최초 set 기준이면 만료, 갱신 기준이면 아직 유효

    expect(cache.get('a')).toBe(2);
  });

  it('clear는 전부 비운다', () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 4 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('잘못된 옵션은 생성 시점에 막는다', () => {
    expect(() => new TtlCache({ ttlMs: 0, maxEntries: 1 })).toThrow(/ttlMs/);
    expect(() => new TtlCache({ ttlMs: 100, maxEntries: 0 })).toThrow(
      /maxEntries/,
    );
  });
});
