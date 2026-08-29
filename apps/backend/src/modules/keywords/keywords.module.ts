import { Module } from '@nestjs/common';
import { KeywordsController } from './keywords.controller';

// 상태가 없어 서비스 계층 없이 컨트롤러가 core 상수를 그대로 노출한다.
@Module({
  controllers: [KeywordsController],
})
export class KeywordsModule {}
