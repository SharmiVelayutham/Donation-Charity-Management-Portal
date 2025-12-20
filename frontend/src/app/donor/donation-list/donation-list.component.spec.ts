import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { DonationListComponent } from './donation-list.component';

describe('DonationListComponent', () => {
  let component: DonationListComponent;
  let fixture: ComponentFixture<DonationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationListComponent, HttpClientTestingModule, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DonationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
