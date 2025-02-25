import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  // Subject to notify about popup visibility changes
  private popupVisibility = new Subject<boolean>();

  popupVisibility$ = this.popupVisibility.asObservable();

  constructor() { }

  openPopup() {
    this.popupVisibility.next(true);
  }

  closePopup() {
    this.popupVisibility.next(false);
  }
}
