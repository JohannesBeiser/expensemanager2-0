import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeItemBottomSheetComponent } from './income-item-bottom-sheet.component';

describe('IncomeItemBottomSheetComponent', () => {
  let component: IncomeItemBottomSheetComponent;
  let fixture: ComponentFixture<IncomeItemBottomSheetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IncomeItemBottomSheetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IncomeItemBottomSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
