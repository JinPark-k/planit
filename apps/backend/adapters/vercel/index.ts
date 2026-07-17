import serverlessExpress from '@codegenie/serverless-express';
import { createApp } from '../../src/bootstrap';

// 배포 타겟(Vercel) 전용 얇은 래퍼. 비즈니스 로직을 두지 않는다.
// 다른 인프라(Oracle Cloud/AWS 등)로 옮길 때는 이 파일과 형제 폴더만 추가/교체하면 된다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedHandler: any;

async function bootstrap() {
  const app = await createApp();
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(event: unknown, context: unknown, callback: unknown) {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context, callback);
}
