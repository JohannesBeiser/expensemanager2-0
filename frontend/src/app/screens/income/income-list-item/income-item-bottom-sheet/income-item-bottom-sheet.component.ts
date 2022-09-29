import { Component, Inject, OnInit } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { IncomeService } from 'src/app/services/income/income.service';
import { AddIncomeModalComponent } from '../../add-income-modal/add-income-modal.component';

@Component({
  selector: 'app-income-item-bottom-sheet',
  templateUrl: './income-item-bottom-sheet.component.html',
  styleUrls: ['./income-item-bottom-sheet.component.less']
})
export class IncomeItemBottomSheetComponent implements OnInit {

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public income: any,
    public incomeService: IncomeService,
    private bottomSheetRef: MatBottomSheetRef<IncomeItemBottomSheetComponent>,
    public dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.bottomSheetRef.backdropClick().subscribe(()=>{
      document.body.style.backgroundColor="#76757b";
    });
  }

  public deleteIncome(e: MouseEvent, key: number) {
    e.stopPropagation();
    if (confirm("Do you really want to delete this expense?")) {
      this.incomeService.deleteIncome(key);
      this.dismiss();
    }
    // this.detailViewShownForIndex = null;
  }

  editIncome(e: MouseEvent){
    // this.sliderService.show('add', this.expense)
    const dialogRef = this.dialog.open(AddIncomeModalComponent, { data: this.income }); // add initial data here
    this.bottomSheetRef.dismiss();
    this.dismiss();
    e.preventDefault();
  }

  close(event: MouseEvent): void {
    this.dismiss();
    event.preventDefault();
  }


  private dismiss(){
    document.body.style.backgroundColor="#76757b";
    this.bottomSheetRef.dismiss();
  }

}
