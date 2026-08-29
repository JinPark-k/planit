import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../../src/bootstrap';

/**
 * 배포 타겟(Vercel) 전용 얇은 래퍼. 비즈니스 로직을 두지 않는다.
 * 다른 인프라(Oracle Cloud/AWS 등)로 옮길 때는 이 파일과 형제 폴더만 추가/교체하면 된다.
 *
 * Vercel의 Node 런타임은 핸들러에 Lambda 이벤트가 아니라 Node의 (req, res)를 그대로 넘긴다.
 * Nest 내부의 Express 인스턴스가 곧 (req, res) 핸들러이므로 그대로 위임한다.
 */
type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

// 값이 아니라 Promise를 캐시한다. 콜드스타트에 요청이 동시에 들어오면
// 값 캐시는 부팅을 두 번 돌리게 된다.
let appPromise: Promise<NodeHandler> | undefined;

async function bootstrap(): Promise<NodeHandler> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as NodeHandler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  appPromise ??= bootstrap();
  (await appPromise)(req, res);
}
