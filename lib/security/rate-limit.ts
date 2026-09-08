/**
 * 앱 레벨 rate limit (TECH_SPEC 8.4절)
 *
 * 목적: 무차별 로그인 시도(brute force)와 봇에 의한 대량 가입을 늦춘다.
 * Supabase Auth 자체에도 기본 rate limit이 있지만, 우리 앱의 Server Action
 * 진입점에서도 IP 기준으로 한 겹 더 막는다.
 *
 * 판정 로직(`evaluateRateLimit`)은 시간·저장소와 분리된 **순수 함수**라
 * 경계값을 단위 테스트로 검증할 수 있다. 실제 카운트 저장은 아래 인메모리
 * 스토어(`hitRateLimit`)가 담당한다.
 *
 * ⚠️ 인메모리 한계: Vercel 같은 서버리스 환경에서는 인스턴스마다 메모리가
 * 분리되고 콜드스타트로 초기화되므로, 이 스토어는 "단일 인스턴스 내 best-effort"
 * 방어다. 운영에서 강한 보장이 필요하면 Upstash Ratelimit 등 공유 저장소 기반으로
 * 교체한다(HANDOFF_08 참고). 저장소만 바꾸고 `evaluateRateLimit`은 재사용하면 된다.
 */

export type RateLimitOptions = {
  /** 윈도 동안 허용할 최대 요청 수 */
  limit: number
  /** 윈도 길이(ms) */
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  /** 이번 요청까지 반영한 뒤 남은 허용 횟수 */
  remaining: number
  /** 차단된 경우, 다시 시도 가능해지기까지 남은 시간(ms). 허용 시 0 */
  retryAfterMs: number
}

/** 주요 엔드포인트별 기본값 */
export const RATE_LIMITS = {
  /** 로그인: 5분에 10회 */
  login: { limit: 10, windowMs: 5 * 60_000 },
  /** 가입: 10분에 5회 (봇 대량 가입 억제) */
  signup: { limit: 5, windowMs: 10 * 60_000 },
} as const satisfies Record<string, RateLimitOptions>

/**
 * 슬라이딩 윈도 판정 (순수 함수).
 *
 * @param hits 이전에 기록된 요청 시각(ms) 배열 — 오름차순 가정
 * @param now  현재 시각(ms)
 * @returns 허용 여부와, 저장소가 다음에 보관해야 할 `kept` 배열
 */
export function evaluateRateLimit(
  hits: readonly number[],
  now: number,
  opts: RateLimitOptions
): RateLimitResult & { kept: number[] } {
  const cutoff = now - opts.windowMs
  // 윈도 밖(오래된) 기록은 버린다
  const kept = hits.filter((t) => t > cutoff)

  if (kept.length >= opts.limit) {
    // 가장 오래된 기록이 윈도를 벗어나야 한 자리가 생긴다
    const earliest = kept[0]
    const retryAfterMs = Math.max(0, earliest + opts.windowMs - now)
    return { allowed: false, remaining: 0, retryAfterMs, kept }
  }

  const next = [...kept, now]
  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - next.length),
    retryAfterMs: 0,
    kept: next,
  }
}

// --- 인메모리 스토어 (런타임 전용) ---

const buckets = new Map<string, number[]>()

/**
 * 키(예: `login:1.2.3.4`) 하나에 대해 요청 1건을 반영하고 결과를 돌려준다.
 * 허용이면 이번 요청을 기록하고, 차단이면 기록하지 않는다(차단 요청으로 윈도가
 * 계속 밀려 영구 차단되는 것을 막기 위함).
 */
export function hitRateLimit(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now()
): RateLimitResult {
  const prev = buckets.get(key) ?? []
  const result = evaluateRateLimit(prev, now, opts)

  if (result.allowed) {
    buckets.set(key, result.kept)
  } else {
    // 차단 시에도 만료된 기록은 정리해둔다
    buckets.set(key, result.kept)
  }

  // 비어버린 버킷은 제거해 메모리 누수를 막는다
  if (buckets.get(key)?.length === 0) buckets.delete(key)

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    retryAfterMs: result.retryAfterMs,
  }
}

/** 테스트에서 스토어를 초기화할 때 사용 */
export function _resetRateLimitStore() {
  buckets.clear()
}
