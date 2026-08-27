import { Injectable } from '@nestjs/common';
import { resolveTagsForKeywords, scoreAndSortPlaces } from '../../core';
import { PlacesService } from '../places/places.service';
import { RecommendQueryDto } from './dto/recommend-query.dto';

@Injectable()
export class RecommendService {
  constructor(private readonly placesService: PlacesService) {}

  async recommend(query: RecommendQueryDto) {
    const tags = resolveTagsForKeywords(query.keywords);
    const candidates = await this.placesService.findByRegion(query.region);
    return scoreAndSortPlaces(candidates, tags);
  }
}
