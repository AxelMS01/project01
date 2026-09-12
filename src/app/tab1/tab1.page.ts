import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  user: any = null;

  constructor(private navCtrl: NavController) {}

  ngOnInit() {
    this.loadUserData();
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  loadUserData() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    } else {
      this.user = null;
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.user = null;
    this.navCtrl.navigateRoot('/login', { animated: true, animationDirection: 'back' });
  }
}
