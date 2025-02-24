import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IciciCustomLibComponent } from './icici-custom-lib.component';

describe('IciciCustomLibComponent', () => {
  let component: IciciCustomLibComponent;
  let fixture: ComponentFixture<IciciCustomLibComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [IciciCustomLibComponent]
    });
    fixture = TestBed.createComponent(IciciCustomLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
