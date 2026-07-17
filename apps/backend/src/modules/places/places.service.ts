import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../infra/supabase/supabase.provider';

@Injectable()
export class PlacesService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  // TODO: Supabase places 테이블 스키마 확정 후 실제 조회 로직 구현.
  async findByRegion(_regionCode: string) {
    throw new Error('Not implemented: PlacesService.findByRegion');
  }
}
