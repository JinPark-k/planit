import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * 배포 타겟과 무관한 공용 Nest 앱 생성 함수.
 * 로컬 서버(main.ts)와 서버리스 어댑터(adapters/*) 양쪽에서 이 함수만 사용한다.
 */
export async function createApp(): Promise<INestApplication> {
  return NestFactory.create(AppModule);
}
