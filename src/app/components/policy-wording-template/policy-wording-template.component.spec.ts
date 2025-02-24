import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolicyWordingTemplateComponent } from './policy-wording-template.component';

describe('PolicyWordingTemplateComponent', () => {
  let component: PolicyWordingTemplateComponent;
  let fixture: ComponentFixture<PolicyWordingTemplateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PolicyWordingTemplateComponent]
    });
    fixture = TestBed.createComponent(PolicyWordingTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
