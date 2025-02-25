import { Component } from '@angular/core';
import { PopupService } from 'src/app/Services/popup.service';
@Component({
  selector: 'app-cibi-score-option',
  templateUrl: './cibi-score-option.component.html',
  styleUrls: ['./cibi-score-option.component.css']
})
export class CibiScoreOptionComponent {
 

    constructor(private popupService: PopupService) { }
  
    openPopup() {
      this.popupService.openPopup(); 
    }
  }


