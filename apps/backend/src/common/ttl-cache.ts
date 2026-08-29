export interface TtlCacheOptions {
  ttlMs: number;
  /** 상한. 넘치면 가장 오래 전에 넣은 항목부터 버린다. */
  maxEntries: number;
  /** 시간 소스. 테스트에서 주입한다. */
  now?: () => number;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 프로세스 메모리에 두는 TTL 캐시.
 *
 * 서버리스에서는 인스턴스가 살아 있는 동안만 유지되고, 인스턴스마다 따로 존재한다.
 * 그래서 "확실히 아낀다"가 아니라 "warm 인스턴스가 재사용되는 만큼 아낀다"에 가깝다.
 * 정합성이 중요한 데이터에는 쓰면 안 된다 — 인스턴스별로 값이 다를 수 있다.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: TtlCacheOptions) {
    if (options.ttlMs <= 0) {
      throw new Error(`TtlCache: ttlMs must be > 0 (got ${options.ttlMs})`);
    }
    if (options.maxEntries < 1) {
      throw new Error(
        `TtlCache: maxEntries must be >= 1 (got ${options.maxEntries})`,
      );
    }
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries;
    this.now = options.now ?? Date.now;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    // 같은 키를 다시 넣을 때 먼저 지워야 삽입 순서가 갱신된다.
    // (Map은 기존 키에 set하면 순서를 유지해서, 방금 쓴 항목이 가장 오래된 것으로 남는다.)
    this.entries.delete(key);

    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }

    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}
