import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { supabaseProvider } from '../../infra/supabase/supabase.provider';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, supabaseProvider],
  // Recommend/Schedule이 후보 장소를 가져올 때 사용한다.
  exports: [PlacesService],
})
export class PlacesModule {}
