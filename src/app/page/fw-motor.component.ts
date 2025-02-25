import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-fw-motor',
  templateUrl: './fw-motor.component.html',
  styleUrls: ['./fw-motor.component.css']
})
export class FwMotorComponent {
  isMobile = window.innerWidth <= 1024; // Initial check

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= 1024; // Update on resize
  }
}
