import { NgModule } from '@angular/core';
import { IciciCustomLibComponent } from './icici-custom-lib.component';
import { CommonModule } from '@angular/common';
import { PlansCardComponentComponent } from './components/plans-card-component/plans-card-component.component';
import { SliderComponent } from './components/slider/slider.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    IciciCustomLibComponent,
    PlansCardComponentComponent,
    SliderComponent
  ],
  imports: [CommonModule,FormsModule],
  exports: [
    IciciCustomLibComponent,
    PlansCardComponentComponent,
    SliderComponent
  ]
})
export class IciciCustomLibModule { }
