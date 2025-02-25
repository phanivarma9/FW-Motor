import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
export interface SliderConfig {
  km: string;
  discount: number;
}

@Component({
  selector: 'icici-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css']
})
export class SliderComponent {
  @Input() sliderValues: any;
  @Input() selectedIndex: any
  @Output() updateSelectedIndex = new EventEmitter<any>();
  @ViewChild('slider') slider!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    this.updateSliderUI(false);
  }

  snapToBreakpoints(event: any): void {
    const slider = event.target;
    const value = parseInt(slider.value, 10);
    this.selectedIndex = this.getClosestIndex(value);
    slider.value = this.selectedIndex.toString();

    this.updateSliderUI(true);
  }

  getClosestIndex(value: number): number {
    return this.sliderValues.reduce((closest: any, _: any, index: any) =>
      Math.abs(index - value) < Math.abs(closest - value) ? index : closest,
      0
    );
  }

  updateSliderUI(emitEvent: boolean): void {
    const percentage = (this.selectedIndex / (this.sliderValues.length - 1)) * 100;
    if (this.slider?.nativeElement) {
      this.slider.nativeElement.style.background = `linear-gradient(to right, #ec6625 ${percentage}%, #ddd ${percentage}%)`;
    }
    if (emitEvent) {
      this.updateSelectedIndex.emit({
        value: this.sliderValues[this.selectedIndex],
      });
    }

  }
  isActive(index: number): boolean {
    return index <= this.selectedIndex - 1;
  }
}
