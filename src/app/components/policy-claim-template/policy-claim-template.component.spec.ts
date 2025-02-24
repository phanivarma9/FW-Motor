import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolicyClaimTemplateComponent } from './policy-claim-template.component';

describe('PolicyClaimTemplateComponent', () => {
  let component: PolicyClaimTemplateComponent;
  let fixture: ComponentFixture<PolicyClaimTemplateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PolicyClaimTemplateComponent]
    });
    fixture = TestBed.createComponent(PolicyClaimTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
