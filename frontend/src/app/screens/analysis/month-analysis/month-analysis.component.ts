import { Component, OnInit } from '@angular/core';
import { differenceInDays, endOfDay, endOfMonth, isWithinInterval, startOfDay, subDays } from 'date-fns';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, take } from 'rxjs/operators';
import { AnalysisService } from 'src/app/services/analysis/analysis.service';
import { Category, CategoryService, HardcodedCategories } from 'src/app/services/category/category.service';
import { Expense, ExpenseService } from 'src/app/services/expenses/expense.service';
import { HardcodedTags } from 'src/app/services/tag/tag.service';
import { Restriction } from '../all-time-analysis/all-time-analysis.component';


type Stats = {
  averagePerDay: number,
  total: number;
  totalTravel: number;
  totalInvest: number;
  totalRecurring: number;
  amountOfDays: number;
  categoryData: {
    category: number,
    expenses: Expense[],
    total: number,
  }[]
}

@Component({
  selector: 'app-month-analysis',
  templateUrl: './month-analysis.component.html',
  styleUrls: ['./month-analysis.component.less']
})
export class MonthAnalysisComponent implements OnInit {

  categorySelected: number = 0;
  public categories$: Observable<Category[]>;
  monthSelection: string;
  restrictionSelected: Restriction;
  allExpenses: Expense[];

  private dateInterval: {start: Date, end: Date} = {start: undefined, end: undefined}

  stats: Stats = {
    averagePerDay: 0,
    total: 0,
    totalTravel: 0,
    totalInvest: 0,
    totalRecurring: 0,
    amountOfDays: 0,
    categoryData: []
  }

  constructor(
    private categoryService: CategoryService,
    private analysisService: AnalysisService,
    private expenseService: ExpenseService
  ) { }

  ngOnInit(): void {
    this.monthSelection = `${new Date().getFullYear()}-${this.addLeadingZero(new Date().getMonth()+1)}`;

    if(this.last30Active){
      this.stats.amountOfDays = 30;
      this.dateInterval.start= subDays(startOfDay(new Date()), 30),
      this.dateInterval.end= this.dateInterval.end = endOfDay(new Date())
    }else{
      this.dateInterval.start= new Date(this.monthSelection),
      this.dateInterval.end= endOfMonth(this.dateInterval.start)

      this.stats.amountOfDays = differenceInDays(this.dateInterval.end, this.dateInterval.start) +1;
    }

    this.categories$ = this.categoryService.getCategoriesNew().pipe(
      filter(categories => categories.length > 0),
      map(categories => categories.filter(category => category.name !== 'unassigned' && category.id !==999))
    );

    let initialRestriction = this.analysisService.getInitialRestriction();
    this.restrictionSelected = initialRestriction;

    this.expenseService.getExpensesWithoutUpdate().pipe(
      distinctUntilChanged(),
      filter(expenses=>expenses.length>0),
      take(1)
    ).subscribe(expenses=>{
      this.allExpenses = expenses;
      this.filtersChanged();
      console.log("expenses received")
    })
  }

  resetStats(){
    this.stats= {
      averagePerDay: 0,
      total: 0,
      totalTravel: 0,
      totalInvest: 0,
      totalRecurring: 0,
      amountOfDays: 0,
      categoryData: []
    }
  }

  //yes this should all be observables instead of direct fundtion call, but whatever - have fun maintaining this trash code. I know its trash but its fast coding
  filtersChanged(){
    this.resetStats();
    if(this.last30Active){
      this.stats.amountOfDays = 30;
      this.dateInterval.start= subDays(startOfDay(new Date()), 30);
      this.dateInterval.end = endOfDay(new Date());
    }else{
      this.dateInterval.start = new Date(this.monthSelection);
      this.dateInterval.end=endOfMonth(this.dateInterval.start);
      this.stats.amountOfDays = differenceInDays(this.dateInterval.end, this.dateInterval.start) +1;
    }

    let filteredExpenses = this.allExpenses.filter(expense=>{
      return this.matchesFilter(expense);
    })

    filteredExpenses.forEach(expense=>{

      this.stats.total+=expense.amount;

      if(expense.tags.includes(HardcodedTags.Travel)){
        this.stats.totalTravel+= expense.amount;
      }
      if(expense.category == HardcodedCategories.Invest){
        this.stats.totalInvest+= expense.amount;
      }
      if(expense.recurring){
        this.stats.totalRecurring+=expense.amount
      }
    });

    this.stats. averagePerDay = this.stats.total / this.stats.amountOfDays;

  }

  matchesFilter(expense: Expense): boolean{
    let matches = true;

    matches = isWithinInterval(new Date(expense.date),this.dateInterval);
    if(!matches) return false;

    if(parseInt(this.categorySelected as any) !== 0 && expense.category!== parseInt(this.categorySelected as any) ){
      return false;
    }

    switch (this.restrictionSelected) {
      case "no-invest":
        if(expense.category == HardcodedCategories.Invest) return false; // eliminate invest expenses
        break;
      case "no-special":
        if(expense.tags.some(tag =>[HardcodedTags.Special, HardcodedTags.SpecialTravel].includes(tag))) return false;
        break;
      case "no-special-no-invest":
        if(expense.category == HardcodedCategories.Invest) return false; // eliminate invest expenses
        if(expense.tags.some(tag =>[HardcodedTags.Special, HardcodedTags.SpecialTravel].includes(tag))) return false;

        break;

      default:
        break;
    }

    return matches;

  }

  categoryChanged(){
    this.filtersChanged();
  }

  monthChanged(){
    let dateSelected = new Date(this.monthSelection)
    this.last30Active = false;
    this.filtersChanged()
  }

  public restrictionChanged() {
    this.analysisService.setInitialRestriction(this.restrictionSelected)
    this.filtersChanged();
    this.filtersChanged();
  }

  public last30Active: boolean = false;

  activateLast30(){
    if(!this.last30Active){
      this.last30Active = true;
      this.filtersChanged();
    }
  }

  deactivate30Days(){
    if(this.last30Active){
      this.last30Active = false;
      this.filtersChanged();
    }
  }

  addLeadingZero(num: number): string{
    if(num<10){
      return `0` + num;
    }else{
      return '' + num
    }
  }


}
