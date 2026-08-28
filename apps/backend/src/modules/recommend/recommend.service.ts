import { Injectable } from '@nestjs/common';
import { resolveTagsForKeywords, scoreAndSortPlaces } from '../../core';
import { toPlace } from '../../infra/supabase/place.mapper';
import { PlaceRow } from '../../infra/supabase/places.types';
import { PlacesService } from '../places/places.service';
import {
  PlaceResponseDto,
  toPlaceResponse,
} from '../places/dto/place-response.dto';
import { RecommendQueryDto } from './dto/recommend-query.dto';

@Injectable()
export class RecommendService {
  constructor(private readonly placesService: PlacesService) {}

  /**
   * 키워드 → 태그 매핑으로 스코어링한 뒤 점수 내림차순으로 장소를 반환한다.
   *
   * 스코어는 응답에 싣지 않는다 — 내부 튜닝 값이고, 순서가 곧 추천 순위다.
   * TODO: 개수 제한/무관 장소 컷오프는 "추천 장소 노출 API" 작업에서 붙인다.
   * 현재는 해당 지역 전체를 정렬해서 돌려준다(서울 기준 1,700건대).
   */
  async recommend(query: RecommendQueryDto): Promise<PlaceResponseDto[]> {
    const tags = resolveTagsForKeywords(query.keywords);
    const rows = await this.placesService.findRowsByRegion(query.region);

    // 스코어링은 도메인 Place로 하고, 응답은 표시 필드가 남아 있는 row에서 만든다.
    const rowById = new Map(rows.map((row) => [row.content_id, row]));
    const scored = scoreAndSortPlaces(rows.map(toPlace), tags);

    return scored
      .map(({ place }) => rowById.get(place.id))
      .filter((row): row is PlaceRow => row !== undefined)
      .map(toPlaceResponse);
  }
}
