import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { Tab1PageModule } from './tab1.module';
import { Tab1Page } from './tab1.page';
import { UmaService } from '../services/uma.service';
import { vi } from 'vitest';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
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
});
