import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';
import { KeywordsModule } from './modules/keywords/keywords.module';
import { RecommendModule } from './modules/recommend/recommend.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { PlacesModule } from './modules/places/places.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    KeywordsModule,
    RecommendModule,
    ScheduleModule,
    PlacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
