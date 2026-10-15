import { Component } from '@angular/core';
import { ConnectionService } from './services/connection.service';
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
  mail,
  searchOutline, heartOutline, settingsOutline, personOutline,
  chevronForwardOutline, gridOutline, gitNetworkOutline, copyOutline,
  constructOutline, mailOutline, optionsOutline, closeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(public connection: ConnectionService) {
    addIcons({
      searchOutline, heartOutline, settingsOutline, personOutline,
      chevronForwardOutline, gridOutline, gitNetworkOutline, copyOutline,
      constructOutline, mailOutline, optionsOutline, closeOutline,
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
