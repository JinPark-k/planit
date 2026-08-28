import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { PlacesQueryDto } from './dto/places-query.dto';
import { PagedPlacesDto } from './dto/paged-places.dto';
import { paginate } from './dto/pagination.dto';
import { toPlaceResponse } from './dto/place-response.dto';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({
    summary: '지역별 장소 목록',
    description:
      '지역 내 장소를 content_id 순으로 반환한다. 키워드 스코어링은 하지 않는다(그건 POST /recommend).',
  })
  @ApiOkResponse({ type: PagedPlacesDto })
  async findByRegion(@Query() query: PlacesQueryDto): Promise<PagedPlacesDto> {
    const rows = await this.placesService.findRowsByRegion(query.regionCode, {
      category: query.category,
    });
    return paginate(rows.map(toPlaceResponse), query.limit, query.offset);
  }
}
