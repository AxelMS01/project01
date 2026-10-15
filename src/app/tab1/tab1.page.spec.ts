import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { Tab1PageModule } from './tab1.module';
import { Tab1Page } from './tab1.page';
import { UmaService } from '../services/uma.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
    addIcons(icons);
    await TestBed.configureTestingModule({
      imports: [Tab1PageModule, RouterModule.forRoot([])],
      providers: [{ provide: UmaService, useValue: {
        getUmas: vi.fn().mockResolvedValue({ data: [], fromCache: true, timestamp: '29/09/2026', warning: 'Sin conexión a la red.' })
      } }]
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra un aviso persistente y la fecha al usar caché', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('copia guardada');
    expect(fixture.nativeElement.textContent).toContain('29/09/2026');
    expect(component.showOfflineBanner).toBe(true);
  });

  it('vuelve a consultar al recuperar conexión', async () => {
    await fixture.whenStable();
    const service = TestBed.inject(UmaService);
    vi.mocked(service.getUmas).mockClear();
    window.dispatchEvent(new Event('online'));
    await fixture.whenStable();
    expect(service.getUmas).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar después de un error y muestra el estado vacío', async () => {
    await fixture.whenStable();
    const service = TestBed.inject(UmaService);
    vi.mocked(service.getUmas).mockRejectedValueOnce(new Error('Servidor inaccesible'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await component.cargarUmas();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Error de Conexión');
      const retry: HTMLElement = fixture.nativeElement.querySelector('.state-card ion-button');
      retry.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(component.errorMensaje).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('No hay registros disponibles');
    } finally {
      log.mockRestore();
    }
  });

  it('alterna estadísticas por tarjeta sin recargar ni cambiar crecimiento o aptitudes', async () => {
    await fixture.whenStable();
    const service = TestBed.inject(UmaService);
    vi.mocked(service.getUmas).mockResolvedValue({ fromCache: false, timestamp: null, data: [{
      id: 1, name: 'Oguri Cap', rarity: 3, imageUrl: 'assets/shapes.svg',
      baseStats: { speed: 101, stamina: 0, power: 106, guts: 84, wit: 93 },
      maxStats: { speed: 120, stamina: 90, power: null, guts: 100, wit: 110 },
      growthRates: { speed: 20, stamina: 0, power: 10, guts: 0, wit: 0 },
      aptitudes: { turf: 'A', dirt: 'B', short: 'E', mile: 'A', medium: 'A', long: 'B', front: 'F', leader: 'A', betweener: 'A', chaser: 'D' }
    }] });
    await component.cargarUmas();
    fixture.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('.uma-card');
    const values = () => [...card.querySelectorAll('.stat-tile strong')].map(el => el.textContent?.trim());
    expect(values()).toEqual(['101', '0', '106', '84', '93']);
    expect(card.querySelector('ion-segment-button[value="base"]')?.textContent).toContain('3★');
    const growth = card.querySelector('.growth-row')?.textContent;
    const aptitudes = card.querySelector('.aptitude-grid')?.textContent;
    vi.mocked(service.getUmas).mockClear();
    const segment = card.querySelector('ion-segment')!;
    segment.value = 'max';
    segment.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'max' } }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(values()).toEqual(['120', '90', '—', '100', '110']);
    expect(card.querySelector('.growth-row')?.textContent).toBe(growth);
    expect(card.querySelector('.aptitude-grid')?.textContent).toBe(aptitudes);
    expect(service.getUmas).not.toHaveBeenCalled();
  });
});
