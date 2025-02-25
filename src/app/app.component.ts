import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'fw-motor';
  selectedIndex:any = 2;
  sliderValues:any = [
    { km: '2,500 km', discount: 3435 },
    { km: '5,000 km', discount: 1620 },
    { km: '7,500 km', discount: 1003 },
    { km: '10,000 km', discount: 407 },
    { km: 'Unlimited km', discount: 0 },
  ];
  getSelectedRangeOption(data:any){
            console.log(data,'data')
  }

}
