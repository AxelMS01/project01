import { Injectable, OnDestroy, signal } from '@angular/core';

/** Tener red no garantiza que el servidor sea alcanzable. */
@Injectable({ providedIn: 'root' })
export class ConnectionService implements OnDestroy {
  readonly online = signal(navigator.onLine);
  private readonly update = () => this.online.set(navigator.onLine);

  constructor() {
    window.addEventListener('online', this.update);
    window.addEventListener('offline', this.update);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.update);
    window.removeEventListener('offline', this.update);
  }
}
