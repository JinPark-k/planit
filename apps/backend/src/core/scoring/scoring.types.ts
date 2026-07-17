export interface ScorablePlace {
  id: string;
  tags: string[];
  popularity: number;
  rating: number;
}

export interface ScoringWeights {
  tagMatch: number;
  popularity: number;
  rating: number;
}

export interface ScoredPlace<T extends ScorablePlace = ScorablePlace> {
  place: T;
  score: number;
}
