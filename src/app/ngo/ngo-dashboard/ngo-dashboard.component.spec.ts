import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { NgoDashboardComponent } from './ngo-dashboard.component';

describe('NgoDashboardComponent', () => {
  let component: NgoDashboardComponent;
  let fixture: ComponentFixture<NgoDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgoDashboardComponent, HttpClientTestingModule, RouterTestingModule]
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
