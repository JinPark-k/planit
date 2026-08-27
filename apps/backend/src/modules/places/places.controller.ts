import { Controller, Get, Query } from '@nestjs/common';
import { PlacesService } from './places.service';
import type { RegionCode } from '../../infra/tour-api/regions';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  findByRegion(@Query('regionCode') regionCode: RegionCode) {
    return this.placesService.findByRegion(regionCode);
  }
}
