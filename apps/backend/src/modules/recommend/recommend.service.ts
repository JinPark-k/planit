import { Injectable } from '@nestjs/common';
import { resolveTagsForKeywords, scoreAndSortPlaces } from '../../core';
import { toPlace } from '../../infra/supabase/place.mapper';
import { PlaceListRow } from '../../infra/supabase/places.types';
import { PlacesService } from '../places/places.service';
import { PagedPlacesDto } from '../places/dto/paged-places.dto';
import { paginate } from '../places/dto/pagination.dto';
import { toPlaceResponse } from '../places/dto/place-response.dto';
import { RecommendQueryDto } from './dto/recommend-query.dto';

@Injectable()
export class RecommendService {
  constructor(private readonly placesService: PlacesService) {}

  /**
   * 키워드 → 태그로 후보를 좁히고 스코어 내림차순으로 반환한다.
   *
   * 키워드 태그가 하나도 안 겹치는 장소는 후보에서 제외한다(DB에서 처리).
   * 절대 점수 임계값을 쓰지 않는 이유: tagMatchRatio의 분모가 키워드 태그 수라
   * 키워드를 조합할수록 최고점이 내려간다(제주 실측 — 단일 0.60, 2개 조합 0.35, 3개 0.31).
   * 고정 임계값을 두면 조합 검색에서 전부 잘린다. "매칭 0개"는 키워드 수와 무관한 경계다.
   *
   * 스코어는 응답에 싣지 않는다 — 내부 튜닝 값이고, 순서가 곧 추천 순위다.
   */
  async recommend(query: RecommendQueryDto): Promise<PagedPlacesDto> {
    const tags = resolveTagsForKeywords(query.keywords);
    const rows = await this.placesService.findRowsByRegion(query.region, {
      category: query.category,
      anyTags: tags,
    });

    // 스코어링은 도메인 Place로 하고, 응답은 표시 필드가 남아 있는 row에서 만든다.
    const rowById = new Map(rows.map((row) => [row.content_id, row]));
    const scored = scoreAndSortPlaces(rows.map(toPlace), tags);

    const ranked = scored
      .map(({ place }) => rowById.get(place.id))
      .filter((row): row is PlaceListRow => row !== undefined)
      .map(toPlaceResponse);

    return paginate(ranked, query.limit, query.offset);
  }
}
