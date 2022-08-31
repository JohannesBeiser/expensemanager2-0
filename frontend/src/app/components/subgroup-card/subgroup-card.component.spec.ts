import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubgroupCardComponent } from './subgroup-card.component';

describe('SubgroupCardComponent', () => {
  let component: SubgroupCardComponent;
  let fixture: ComponentFixture<SubgroupCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubgroupCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubgroupCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
