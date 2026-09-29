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

// Contrato del catálogo transformado por backend/api.php::formatUma().
export interface Uma {
  id: number;
  name: string;
  rarity: number;
  // Tab1 normaliza rareza_base desde rarity; los campos sueltos son compatibilidad opcional.
  rareza_base?: number;
  base_speed?: number;
  base_stamina?: number;
  base_power?: number;
  base_guts?: number;
  base_wit?: number;
  max_speed?: number;
  max_stamina?: number;
  max_power?: number;
  max_guts?: number;
  max_wit?: number;
  imageUrl: string;
  // Formato agrupado que devuelve actualmente PHP, incluyendo ambas rarezas en el mismo GET.
  baseStats: UmaStats;
  maxStats?: { [Stat in keyof UmaStats]?: number | null };
  growthRates: UmaStats;
  aptitudes: UmaAptitudes;
}

// En catálogo T=Uma[] y en detalle T=Uma. Login/registro usan user, no este contrato.
// Estas interfaces solo tipan el código: no validan respuestas en tiempo de ejecución.
export interface ApiResponse<T> {
  status: string;
  total?: number;
  data: T;
  message?: string;
}
