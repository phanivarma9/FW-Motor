import { Component, OnInit } from '@angular/core';
import { PopupService } from 'src/app/Services/popup.service';

@Component({
  selector: 'app-cibi-score-popup',       // Define the selector for the component
  templateUrl: './cibi-score-popup.component.html',  // Point to the HTML template
  styleUrls: ['./cibi-score-popup.component.css']   // Optional: Point to the styles (if any)
})
export class CibiScorePopupComponent implements OnInit {
  isPopupVisible: boolean = false;

  name: string = '';
  panCardNumber: string = '';  // Change to string to accept PAN card numbers with dashes

  errorMessage: string = '';  // Error message to display when fields are empty

  constructor(private popupService: PopupService) { }

  ngOnInit(): void {
    // Subscribe to popup visibility changes
    this.popupService.popupVisibility$.subscribe((isVisible: boolean) => {
      this.isPopupVisible = isVisible;
    });
  }



  closePopup() {
    this.popupService.closePopup(); // Close the popup
  }
}
