import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgoDashboardComponent } from './ngo-dashboard.component';

describe('NgoDashboardComponent', () => {
  let component: NgoDashboardComponent;
  let fixture: ComponentFixture<NgoDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgoDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgoDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
