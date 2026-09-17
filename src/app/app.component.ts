import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { 
  logoFacebook, 
  logoGoogle, 
  logoTwitter, 
  alertCircleOutline, 
  checkmarkCircleOutline, 
  logOutOutline, 
  personCircleOutline, 
  triangle, 
  ellipse, 
  square,
  refreshOutline,
  flashOutline,
  ribbonOutline,
  mail
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    addIcons({
      'logo-facebook': logoFacebook,
      'logo-google': logoGoogle,
      'logo-twitter': logoTwitter,
      'alert-circle-outline': alertCircleOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'log-out-outline': logOutOutline,
      'person-circle-outline': personCircleOutline,
      'refresh-outline': refreshOutline,
      'flash-outline': flashOutline,
      'ribbon-outline': ribbonOutline,
      mail,
      triangle,
      ellipse,
      square
    });
  }
}
