import { NgModule } from '@angular/core';
import { IciciCustomLibComponent } from './icici-custom-lib.component';
import { CommonModule } from '@angular/common';
import { PlansCardComponentComponent } from './components/plans-card-component/plans-card-component.component';



@NgModule({
  declarations: [
    IciciCustomLibComponent,
    PlansCardComponentComponent
  ],
  imports: [CommonModule],
  exports: [
    IciciCustomLibComponent,
    PlansCardComponentComponent
  ]
})
export class IciciCustomLibModule { }
