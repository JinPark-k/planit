import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { supabaseProvider } from '../../infra/supabase/supabase.provider';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, supabaseProvider],
})
export class PlacesModule {}
