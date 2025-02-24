import { TestBed } from '@angular/core/testing';

import { IciciCustomLibService } from './icici-custom-lib.service';

describe('IciciCustomLibService', () => {
  let service: IciciCustomLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IciciCustomLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
