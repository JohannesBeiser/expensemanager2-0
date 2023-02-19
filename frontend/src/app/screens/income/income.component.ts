import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Income, IncomeService } from 'src/app/services/income/income.service';
import { AddIncomeModalComponent } from './add-income-modal/add-income-modal.component';

@Component({
  selector: 'app-income',
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.less']
})
export class IncomeComponent implements OnInit {

  constructor(
    private incomeService: IncomeService,
    public dialog: MatDialog,
  ) { }

  total$: Observable<number>;
  earnigns$: Observable<Income[]>;

  ngOnInit(): void {
    this.earnigns$ = this.incomeService.getIncome().pipe(
      filter(el=>el.length>0),
      map(earnings=>{
        return earnings.sort((a,b)=>b.date-a.date)
      })
      );
    this.total$ = this.earnigns$.pipe(
      map(earnings=>{
        return earnings.reduce((acc,cur)=>{
          acc+=cur.amount_net;
          return acc;
        },0)
      })
    )
  }

  // addIncome(){
  //   let income: Income= {
  //     amount: 2650,
  //     group: "Fundis"
  //   }
  //   this.incomeService.addIncome(income)
  // }

  openDialog() {
    const dialogRef = this.dialog.open(AddIncomeModalComponent); // add initial data here

    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });
  }



}
