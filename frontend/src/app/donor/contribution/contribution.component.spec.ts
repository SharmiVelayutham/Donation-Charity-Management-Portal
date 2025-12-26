import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';

import { ContributionComponent } from './contribution.component';

describe('ContributionComponent', () => {
  let component: ContributionComponent;
  let fixture: ComponentFixture<ContributionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContributionComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (_key: string) => 'test-id' } } } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContributionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
