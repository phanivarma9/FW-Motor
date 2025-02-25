import { Component, EventEmitter, Input, Output } from '@angular/core';
// plan-card-config.model.ts
export interface PlanCardConfig {
  title: boolean;
  subtitle?: boolean;
  price: boolean;
  radioBtn:boolean;
  banner: boolean;
  selected?: boolean;
  addOns:boolean;
  desc:boolean;
  customBtn:{visible:boolean, title:string};
  additionalBtn:{visible:boolean, title:string};

}

@Component({
  selector: 'icici-plans-card-component',
  templateUrl: './plans-card-component.component.html',
  styleUrls: ['./plans-card-component.component.css']
})
export class PlansCardComponentComponent {
  @Input() config: PlanCardConfig | any;
  @Input() data: any;
  @Output() selectionChange = new EventEmitter<boolean>();
  @Output() customBtn = new EventEmitter<boolean>();
  @Output() additionalBtn = new EventEmitter<boolean>();
  isSelected:any = false;
  onPlanChange(selectedIndex: any, plan:any): void {
    this.data.forEach((selectedPlan:any, index:any) => {
      selectedPlan.selected = index === selectedIndex;
    });
    this.selectionChange.emit(plan);
  }
  customBtnClick(data:any) {
    this.customBtn.emit(data);
  }
  additionalBtnClick(data:any) {
    this.additionalBtn.emit(data);
  }
}
