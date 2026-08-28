import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * 배포 타겟과 무관한 공용 Nest 앱 생성 함수.
 * 로컬 서버(main.ts)와 서버리스 어댑터(adapters/*) 양쪽에서 이 함수만 사용한다.
 *
 * 전역 파이프/문서 설정을 main.ts가 아니라 여기 두는 이유:
 * main.ts에만 두면 서버리스로 배포했을 때 요청 검증이 통째로 빠진다.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      // DTO에 선언되지 않은 필드는 제거하고(whitelist), 그런 필드가 오면 400으로 거절한다.
      // 조용히 무시하면 오타난 파라미터가 "동작은 하는데 값이 안 먹는" 형태로 숨는다.
      whitelist: true,
      forbidNonWhitelisted: true,
      // 쿼리스트링/바디를 DTO 클래스 인스턴스로 변환해야 데코레이터 검증이 걸린다.
      transform: true,
    }),
  );

  setupSwagger(app);
  return app;
}

/**
 * Swagger UI. 운영에서는 비활성화한다(내부 스키마를 공개할 이유가 없고,
 * 서버리스 환경에서 UI 정적 자산 서빙이 불안정하다).
 * SWAGGER_ENABLED=true로 강제로 켤 수 있다.
 */
function setupSwagger(app: INestApplication): void {
  const enabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    process.env.NODE_ENV !== 'production';
  if (!enabled) return;

  const config = new DocumentBuilder()
    .setTitle('planit API')
    .setDescription(
      '국내 도시 여행 일정 추천 API. 키워드 기반 장소 추천과 일정 생성을 제공한다.',
    )
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
