import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const PLACEHOLDER_URL = 'http://localhost:54321';
const PLACEHOLDER_KEY = 'placeholder-key-set-SUPABASE_URL-and-key-env-vars';

/**
 * Nest DI 없이도(batch/ 스크립트 등에서) 그대로 사용 가능한 plain factory.
 * 환경변수가 없으면 앱 부팅 자체는 막지 않고 경고만 남긴 뒤 placeholder 값으로 클라이언트를 만든다.
 * (placeholder 클라이언트로 실제 쿼리를 호출하면 네트워크/인증 에러가 나므로 문제를 바로 알 수 있다.)
 */
export function createSupabaseClient(
  key: 'anon' | 'serviceRole' = 'anon',
): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const apiKey =
    key === 'serviceRole' ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;

  if (!url || !apiKey) {
    console.warn(
      '[supabase] Missing SUPABASE_URL or Supabase API key in environment — using placeholder client. Set .env before making real Supabase calls.',
    );
  }

  // Node 20은 네이티브 WebSocket이 없어 @supabase/realtime-js가 생성자 단계에서 바로 실패한다.
  // Node 22+로 올리기 전까지는 `ws`를 transport로 명시 주입한다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url ?? PLACEHOLDER_URL, apiKey ?? PLACEHOLDER_KEY, {
    realtime: { transport: WebSocket as any },
  } as any);
}
