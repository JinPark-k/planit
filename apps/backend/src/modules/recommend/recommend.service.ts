import { Injectable } from '@nestjs/common';
import { resolveTagsForKeywords, scoreAndSortPlaces } from '../../core';
import { RecommendQueryDto } from './dto/recommend-query.dto';

@Injectable()
export class RecommendService {
  // TODO: places/places.service.ts를 통해 실제 후보 장소를 가져와 연결한다.
  recommend(query: RecommendQueryDto) {
    const tags = resolveTagsForKeywords(query.keywords);
    return scoreAndSortPlaces([], tags);
  }
}
