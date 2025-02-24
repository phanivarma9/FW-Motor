import { Component } from '@angular/core';

@Component({
  selector: 'app-garages-panel',
  templateUrl: './garages-panel.component.html',
  styleUrls: ['./garages-panel.component.css']
})
export class GaragesPanelComponent {
  totalGarages: number = 6200; 
  city: string = 'Mumbai'; 
  cityGarages: number = 243; 
}
