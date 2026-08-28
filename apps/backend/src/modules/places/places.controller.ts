import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { PlacesQueryDto } from './dto/places-query.dto';
import { PlaceResponseDto, toPlaceResponse } from './dto/place-response.dto';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({
    summary: '지역별 장소 목록',
    description:
      '해당 지역의 장소를 전부 반환한다. TODO: 개수 제한/페이지네이션/카테고리 필터는 "추천 장소 노출 API" 작업에서 붙인다.',
  })
  @ApiOkResponse({ type: [PlaceResponseDto] })
  async findByRegion(
    @Query() query: PlacesQueryDto,
  ): Promise<PlaceResponseDto[]> {
    const rows = await this.placesService.findRowsByRegion(query.regionCode);
    return rows.map(toPlaceResponse);
  }
}
