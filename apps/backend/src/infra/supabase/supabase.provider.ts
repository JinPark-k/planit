import { Provider } from '@nestjs/common';
import { createSupabaseClient } from './supabase.client';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

export const supabaseProvider: Provider = {
  provide: SUPABASE_CLIENT,
  useFactory: () => createSupabaseClient('anon'),
};
