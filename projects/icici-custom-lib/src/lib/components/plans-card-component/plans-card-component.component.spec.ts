import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlansCardComponentComponent } from './plans-card-component.component';

describe('PlansCardComponentComponent', () => {
  let component: PlansCardComponentComponent;
  let fixture: ComponentFixture<PlansCardComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlansCardComponentComponent]
    });
    fixture = TestBed.createComponent(PlansCardComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
