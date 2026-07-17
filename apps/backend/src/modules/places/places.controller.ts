import { Controller, Get, Query } from '@nestjs/common';
import { PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  findByRegion(@Query('regionCode') regionCode: string) {
    return this.placesService.findByRegion(regionCode);
  }
}
