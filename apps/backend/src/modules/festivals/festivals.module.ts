import { Module } from '@nestjs/common';
import { supabaseProvider } from '../../infra/supabase/supabase.provider';
import { FestivalsController } from './festivals.controller';
import { FestivalsService } from './festivals.service';

@Module({
  controllers: [FestivalsController],
  providers: [FestivalsService, supabaseProvider],
  // 축제를 앵커로 일정을 만들 때 스케줄 쪽에서 축제 행을 다시 찾는다.
  exports: [FestivalsService],
})
export class FestivalsModule {}
