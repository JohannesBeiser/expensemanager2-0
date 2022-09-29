import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeListItemComponent } from './income-list-item.component';

describe('IncomeListItemComponent', () => {
  let component: IncomeListItemComponent;
  let fixture: ComponentFixture<IncomeListItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IncomeListItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IncomeListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
