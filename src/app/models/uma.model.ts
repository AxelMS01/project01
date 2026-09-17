export interface UmaStats {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wit: number;
}

export interface UmaAptitudes {
  turf: string;
  dirt: string;
  short: string;
  mile: string;
  medium: string;
  long: string;
  front: string;
  leader: string;
  betweener: string;
  chaser: string;
}

export interface Uma {
  id: number;
  name: string;
  rarity: number;
  imageUrl: string;
  baseStats: UmaStats;
  growthRates: UmaStats;
  aptitudes: UmaAptitudes;
}

export interface ApiResponse<T> {
  status: string;
  total?: number;
  data: T;
  message?: string;
}