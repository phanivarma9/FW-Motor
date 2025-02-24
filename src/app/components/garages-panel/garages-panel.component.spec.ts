import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GaragesPanelComponent } from './garages-panel.component';

describe('GaragesPanelComponent', () => {
  let component: GaragesPanelComponent;
  let fixture: ComponentFixture<GaragesPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GaragesPanelComponent]
    });
    fixture = TestBed.createComponent(GaragesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
