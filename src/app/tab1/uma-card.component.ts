import { Component, Input } from '@angular/core';
import { Uma, UmaStats } from '../models/uma.model';
import { flash, heart, barbell, flame, school } from 'ionicons/icons';

export type UmaCard = Uma & { statMode: 'base' | 'max' };

@Component({
  selector: 'app-uma-card',
  templateUrl: './uma-card.component.html',
  styleUrls: ['./uma-card.component.scss'],
  standalone: false,
})
export class UmaCardComponent {
  @Input({ required: true }) uma!: UmaCard;
  readonly statDefinitions: { key: keyof UmaStats; label: string; icon: string }[] = [
    { key: 'speed', label: 'Speed', icon: flash },
    { key: 'stamina', label: 'Stamina', icon: heart },
    { key: 'power', label: 'Power', icon: barbell },
    { key: 'guts', label: 'Guts', icon: flame },
    { key: 'wit', label: 'Wit', icon: school }
  ];

  /**
   * Selección local: cambiar a 5★ no llama a la API ni altera Growth Rates/aptitudes.
   * PHP agrupa base_* en baseStats y max_* en maxStats; también se admiten campos sueltos.
   * null permite mostrar — cuando no hay dato, conservando los ceros válidos.
   */
  getStat(uma: UmaCard, stat: keyof UmaStats): number | null {
    if (uma.statMode === 'max') {
      return uma[`max_${stat}`] ?? uma.maxStats?.[stat] ?? null;
    }
    return uma[`base_${stat}`] ?? uma.baseStats?.[stat] ?? null;
  }

  /**
   * Genera la representación en estrellas según la rareza de la Uma Musume
   */
  onImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/shapes.svg')) image.src = 'assets/shapes.svg';
  }

  getRarityStars(rarity: number): string {
    return '★'.repeat(rarity);
  }

}
