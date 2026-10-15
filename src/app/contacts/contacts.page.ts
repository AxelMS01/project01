import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput, IonTextarea, IonSpinner, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Contact, ContactInput, ContactService } from '../services/contact.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput, IonTextarea, IonSpinner],
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss']
})
export class ContactsPage implements OnInit {
  private readonly api = inject(ContactService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly alerts = inject(AlertController);
  contacts: Contact[] = [];
  form: ContactInput = this.emptyForm();
  editingId: number | null = null;
  busy = false;
  error = '';
  result = '';
  operation = '';
  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    await this.run('GET', async () => {
      this.contacts = await firstValueFrom(this.api.list());
      this.result = `GET · Lista actualizada: ${this.contacts.length} mensajes.`;
    });
  }
  async save(): Promise<void> {
    const input = Object.fromEntries(Object.entries(this.form).map(([key, value]) => [key, value.trim()])) as unknown as ContactInput;
    if (Object.values(input).some(value => !value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      this.error = 'Completa todos los campos con un correo válido.';
      return;
    }
    const id = this.editingId;
    await this.run(id === null ? 'POST' : 'PUT', async () => {
      const contact = await firstValueFrom(id === null ? this.api.create(input) : this.api.update(id, input));
      this.contacts = [contact, ...this.contacts.filter(item => Number(item.id) !== Number(contact.id))];
      this.result = `${id === null ? 'POST · 201' : 'PUT · 200'} · Mensaje #${contact.id} ${id === null ? 'creado' : 'actualizado'}.`;
      this.reset();
    });
  }
  edit(contact: Contact): void {
    if (this.busy) return;
    this.editingId = Number(contact.id);
    const { nombre, apellido, email, mensaje } = contact;
    this.form = { nombre, apellido, email, mensaje };
    this.error = '';
  }
  reset(): void { this.editingId = null; this.form = this.emptyForm(); }
  async remove(contact: Contact): Promise<void> {
    if (this.busy) return;
    const alert = await this.alerts.create({
      header: 'Eliminar mensaje', message: `¿Eliminar el mensaje #${contact.id}? Esta acción es permanente.`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'confirm' }]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    await this.run('DELETE', async () => {
      await firstValueFrom(this.api.remove(Number(contact.id)));
      this.contacts = this.contacts.filter(item => Number(item.id) !== Number(contact.id));
      if (this.editingId === Number(contact.id)) this.reset();
      this.result = `DELETE · 200 · Mensaje #${contact.id} eliminado.`;
    });
  }
  private async run(method: string, action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.result = '';
    this.operation = method;
    this.cdr.detectChanges();
    try { await action(); }
    catch (error: unknown) { this.error = error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.'; }
    finally { this.busy = false; this.cdr.detectChanges(); }
  }
  private emptyForm(): ContactInput { return { nombre: '', apellido: '', email: '', mensaje: '' }; }
}
