import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PlaceCategory } from '../../../core';
import type { PlaceListRow } from '../../../infra/supabase/places.types';

export class GeoPointDto {
  @ApiProperty({ example: 33.2489 })
  lat!: number;

  @ApiProperty({ example: 126.4123 })
  lng!: number;
}

/**
 * 화면용 장소 표현.
 *
 * core의 `Place`를 그대로 내보내지 않는 이유: core는 스케줄링에 필요한 최소 필드만 갖고
 * 주소/이미지/전화를 의도적으로 버린다(infra/supabase/place.mapper.ts 참고).
 * 화면은 그 필드들이 필요하므로 DB row에서 직접 만든다.
 */
export class PlaceResponseDto {
  @ApiProperty({ description: 'TourAPI contentId', example: '2871024' })
  id!: string;

  @ApiProperty({ example: '천제연폭포' })
  name!: string;

  @ApiProperty({ enum: ['SIGHTSEEING', 'FOOD', 'ACTIVITY'] })
  category!: PlaceCategory;

  @ApiProperty({ type: [String], example: ['자연', '산책'] })
  tags!: string[];

  @ApiProperty({ type: GeoPointDto })
  location!: GeoPointDto;

  @ApiPropertyOptional({ example: '제주특별자치도 서귀포시 중문동' })
  address?: string;

  @ApiPropertyOptional({ description: 'TourAPI 대표 이미지 URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: '064-760-6331' })
  tel?: string;
}

/** 빈 문자열은 값이 없는 것으로 취급한다(TourAPI가 미기입을 ''로 준다). */
function optional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * TourAPI 이미지 URL의 스킴을 https로 올린다.
 *
 * 표본 700건 중 이미지가 있는 617건이 전부 tong.visitkorea.or.kr 단일
 * 호스트이고, 그중 233건(38%)이 http로 저장돼 있다. 같은 URL을 https로
 * 바꿔도 동일한 바이트가 내려오는 것을 확인했다(호스트가 https를 지원하는데
 * 데이터에만 http가 섞인 것). 반면 iOS는 ATS(NSAllowsArbitraryLoads=false)가,
 * Android 릴리스 빌드는 cleartext 차단이 http 이미지 자체를 막아 사진 없음으로
 * 떨어진다. 앱을 새로 배포하지 않고 이미 출시된 버전까지 고치기 위해 응답
 * 단계에서 스킴만 올린다.
 */
function upgradeToHttps(url: string | undefined): string | undefined {
  return url?.startsWith('http://') ? `https://${url.slice(7)}` : url;
}

export function toPlaceResponse(row: PlaceListRow): PlaceResponseDto {
  const address = [optional(row.addr1), optional(row.addr2)]
    .filter(Boolean)
    .join(' ');

  return {
    id: row.content_id,
    name: row.name,
    // 호출측이 category IS NOT NULL로 걸러서 넘긴다.
    category: row.category as PlaceCategory,
    tags: row.tags,
    location: { lat: row.lat, lng: row.lng },
    address: address || undefined,
    imageUrl: upgradeToHttps(optional(row.image_url)),
    tel: optional(row.tel),
  };
}
