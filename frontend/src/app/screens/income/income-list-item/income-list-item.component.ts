import { Component, Input, OnInit } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { format } from 'date-fns';
import { Income } from 'src/app/services/income/income.service';
import { IncomeItemBottomSheetComponent } from './income-item-bottom-sheet/income-item-bottom-sheet.component';

@Component({
  selector: 'app-income-list-item',
  templateUrl: './income-list-item.component.html',
  styleUrls: ['./income-list-item.component.less']
})
export class IncomeListItemComponent implements OnInit {

  constructor(
    private bottomSheet: MatBottomSheet
  ) { }

  @Input() incomeEntry: Income;

  dateString: string;

  ngOnInit(): void {
    this.dateString = format(new Date(this.incomeEntry.date), "MMM yyyy")
  }

  openBottomSheet(e){
    e.stopPropagation();
    document.body.style.backgroundColor="#4f5053";
    this.bottomSheet.open(IncomeItemBottomSheetComponent,{data: this.incomeEntry});
  }

}
