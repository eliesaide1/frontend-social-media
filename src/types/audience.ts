export interface AudienceCountry {
  country: string;
  percentage: number;
}

export interface AudienceAgeGroup {
  range: string;
  percentage: number;
}

export interface AudienceGender {
  male: number;
  female: number;
  other: number;
}

export interface AudienceOverview {
  topCountries: AudienceCountry[];
  ageGroups: AudienceAgeGroup[];
  genderSplit: AudienceGender;
}
