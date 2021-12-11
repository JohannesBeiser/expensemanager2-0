import { Component, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { Category, CategoryService } from 'src/app/services/category/category.service';
import { Expense, ExpenseService } from 'src/app/services/expenses/expense.service';
import * as Highcharts from 'highcharts';
import { filter, map, take } from 'rxjs/operators';
import { differenceInDays } from 'date-fns';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseListDialogComponent } from '../expense-list-dialog/expense-list-dialog.component';

type Stats= {
  averagePerMonth: number,
  averagePerDay: number,
  total: number;
  totalTravel: number;
  totalInvest: number;
  expectedTotalEndOfYear: number;
  amountOfDays: number;
  monthsData: {
    month: number;
    total: number;
  }[];
  categoryMonthsData: {
    category: number,
    total: number,
    amountOfDays: number,
    firstDate: Date,
    monthsData: {
      month: number;
      total: number;
    }[];
  }[]
}

@Component({
  selector: 'app-year-analysis',
  templateUrl: './year-analysis.component.html',
  styleUrls: ['./year-analysis.component.less']
})
export class YearAnalysisComponent implements OnInit {

  constructor(
    public categoryService: CategoryService,
    private expenseService: ExpenseService,
    public dialog: MatDialog,

  ) { }
  
  Highcharts: typeof Highcharts = Highcharts;
  public chartReady: boolean = false;
  public categories$: Observable<Category[]>;
  private expenses$: Observable<Expense[]>;
  public selectedYear$: BehaviorSubject<number>;
  public availableYears: number[];
  public yearSelection: number = new Date().getFullYear();
  chartOptions: Highcharts.Options = {};
  categorySelected: number = 0;
  updateFlag: boolean = false;
  categoryPieChartOptions: Highcharts.Options = {}
  tempCategoriesSorted : {category: Category, amount: number, percentage?: number}[];
  tempCategoriesSortedForLegend : {category: Category, amount: number, percentage?: number}[];
  private subs: Subscription[] = [];

  averagePerMonth: number;
  averagePerDay: number;

  public stats: Stats = {
    averagePerMonth: 0,
    averagePerDay: 0,
    total: 0,
    totalTravel: 0,
    totalInvest: 0,
    expectedTotalEndOfYear: 0,
    amountOfDays: 0,
    monthsData: [],
    categoryMonthsData: []
  };

  ngOnInit(): void {
    this.categories$ = this.categoryService.getCategoriesNew().pipe(
      filter(categories => categories.length > 0),
      map(categories => categories.filter(category => category.name !== 'unassigned'))
    );


    this.selectedYear$ = new BehaviorSubject(new Date().getFullYear())
    this.expenses$ = this.expenseService.getExpenses("expenses").pipe(
      filter(expenses => expenses.length>0),
      take(1)
      )
    combineLatest([this.expenses$, this.selectedYear$, this.categories$]).subscribe(([expenses, selectedYear])=>{
      this.availableYears = expenses.reduce((acc,cur)=>{
        let currentYear = new Date(cur.date).getFullYear()
        if(!acc.includes(currentYear)){
          acc.push(currentYear);
        }
        return acc;
      },[])

      this.stats = {
        averagePerMonth: 0,
        averagePerDay: 0,
        total: 0,
        totalTravel: 0,
        totalInvest: 0,
        expectedTotalEndOfYear: 0,
        amountOfDays: 0,
        monthsData: [],
        categoryMonthsData: []
      };


      expenses = expenses.filter(expense=>new Date(expense.date).getFullYear() === parseInt(selectedYear as any));
      let firstDate: Date;
      let lastDate: Date;

      expenses.forEach(expense => {
        if (new Date(expense.date) < new Date()) {
          if (!firstDate) {
            firstDate = new Date(expense.date);
          }

          if (!lastDate) {
            lastDate = new Date(expense.date);
          }

          if (new Date(expense.date) < firstDate) {
            firstDate = new Date(expense.date);
          }

          if (new Date(expense.date) > lastDate) {
            lastDate = new Date(expense.date);
          }

          // all totals
          this.stats.total += expense.amount;

          // months total
          let expenseMonth: number = new Date(expense.date).getMonth();
          let monthsDataMatch = this.stats.monthsData.find(el => el.month === expenseMonth);
          if (!monthsDataMatch) {
            this.stats.monthsData.push({month: new Date(expense.date).getMonth(), total: 0 });
          }
          monthsDataMatch = this.stats.monthsData.find(el => el.month === expenseMonth);
          monthsDataMatch.total += expense.amount;

          if(expense.tags.indexOf(1638199877164)>=0){
            this.stats.totalTravel += expense.amount;
          }

          // years categroy totals
          let expenseCategory: number = expense.category;
          // find the category stats object whch matches the expenses category
          let monthsCategoryMatch = this.stats.categoryMonthsData.find(el => el.category === expenseCategory);
          if (!monthsCategoryMatch) {
            this.stats.categoryMonthsData.push({ category: expenseCategory, total: 0, monthsData: [], amountOfDays: 0, firstDate: null});
          }
          monthsCategoryMatch = this.stats.categoryMonthsData.find(el => el.category === expenseCategory);
          let monthsCategoryDataMatch = monthsCategoryMatch.monthsData.find(el => el.month == expenseMonth);
          if (!monthsCategoryDataMatch) {
            monthsCategoryMatch.monthsData.push({ total: 0, month: expenseMonth });
          }
          monthsCategoryDataMatch = monthsCategoryMatch.monthsData.find(el => el.month == expenseMonth);
          monthsCategoryDataMatch.total += expense.amount;
          monthsCategoryMatch.total += expense.amount
          let expenseDate = new Date(expense.date);
          if(monthsCategoryMatch.firstDate>expenseDate || !monthsCategoryMatch.firstDate){
            monthsCategoryMatch.firstDate = expenseDate
          }
        }
      });

      
      let lastDayOfYear: Date = new Date();
      if(this.yearSelection !== new Date().getFullYear()){
        lastDayOfYear = new Date(`${this.yearSelection}-12-31`)
      }

      let firstDayOfYear: Date = new Date(`${this.yearSelection}-01-01`);
      this.stats.amountOfDays = differenceInDays(lastDayOfYear,firstDayOfYear);
      this.stats.averagePerDay = this.stats.total / this.stats.amountOfDays;
      this.stats.averagePerMonth = this.stats.averagePerDay * 30.437;

      this.averagePerDay = this.stats.averagePerDay;
      this.averagePerMonth = this.stats.averagePerMonth;


      this.stats.categoryMonthsData.forEach(categoryData=>{
        categoryData.amountOfDays = differenceInDays(lastDayOfYear,firstDayOfYear)// categoryData.firstDate) + 1 // 3.dec - 3.dec = 0, but should be 1 // Note: changed to firstDayOfYear instead of categoryData.firstDate because of logical reasons (i wanna know even if a categporie has recently be added the average over that whole year)
        categoryData.total  = Math.round(categoryData.total);
      });


      // 
      this.initializeChart();
      this.initializeCategoryPieChart();
      this.categoryChanged();
    })
  }

  yearSelectionChanged(){
    this.selectedYear$.next(this.yearSelection);
  }


  public categoryChanged(){
    if (this.categorySelected == 0) {
      this.initializeChart()
      this.averagePerMonth = this.stats.averagePerMonth;
      this.averagePerDay = this.stats.averagePerDay;
    } else {
 // a specific category has been chosen
      let selectedCategory: Category = this.categoryService.getCategoryFromId(this.categorySelected);
      let averageValues = this.getAverageValues(selectedCategory.id);
      this.averagePerMonth = averageValues.month;
      this.averagePerDay =  averageValues.day; 

      let monthsFilled = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(el=>el.substr(0,3));
      let valuesFilled = [0,0,0,0,0,0,0,0,0,0,0,0]
  
      this.stats.categoryMonthsData.find(el => el.category == selectedCategory.id).monthsData.sort((a, b) => { return a.month - b.month })
      .forEach(monthData=>{
        valuesFilled[monthData.month]= monthData.total;
      })

      this.chartOptions.xAxis = {
        categories: monthsFilled,
        crosshair: true
      }    


      this.chartOptions.series = [
        {
          color: selectedCategory.color,
          type: 'column',
          data: valuesFilled
        }
      ]
    }
    this.updateFlag = true;
    // this.averageCategoryChanged()
  }

  private initializeChart() {  
    let monthsFilled = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(el=>el.substr(0,3));
    let valuesFilled = [0,0,0,0,0,0,0,0,0,0,0,0]

    this.stats.monthsData.sort((a, b) => { return a.month - b.month }).forEach(monthData=>{
      valuesFilled[monthData.month]= monthData.total;
    })
    
    this.chartOptions = {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: 200,
      },
      credits: {
        enabled: false
      },
      title: {
        text: ''
      },
      legend: {
        enabled: false
      },
      xAxis: {
        categories: monthsFilled,
        crosshair: true
      },
      yAxis: {
        min: 0,
        endOnTick: true,
        title: {
          text: ''
        },
        labels: {
          formatter: function () {
            return this.value + ' €';
          }
        }
      },
      tooltip: { enabled: false },
      plotOptions: {
        column: {
          pointPadding: 0,
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            align: 'center',
            formatter: function () {
              return this.y + ' €';
            }
          },
        },
        series: {

          states: {
            hover: {
              enabled: false,
            },
          }
        }
      },
      series: [
        {
          color: '#444444',
          name: '',
          type: 'column',
          data: valuesFilled,
          dataLabels: {
            enabled: false,
            inside: false
          }
        }]
    };

    this.chartReady = true; // needed so template doesnt try to initialize before its ready because it gets initialized asynchronously in subscribtion of expenses$
  }

  getAverageValues(categoryId: number):{month: number, day: number}{
    let categoryTotal = this.stats.categoryMonthsData.find(el=>el.category == categoryId);
    return {
      month: Math.round(categoryTotal.total / categoryTotal.amountOfDays * 30.437),
      day: Math.round(categoryTotal.total / categoryTotal.amountOfDays)
    }
  }

  public categorySelectedFromLegend(category:Category){
    let sub = this.getTopExpensesForCategory(category).subscribe(expenses=>{
      const dialogRef = this.dialog.open(ExpenseListDialogComponent, { data: {expenses: expenses,category: category} }); // add initial data here
  
      dialogRef.afterClosed().subscribe(result => {
       sub.unsubscribe()
      }); 
    })
    this.subs.push(sub)

  }

  
  public getTopExpensesForCategory(category: Category): Observable<Expense[]>{
    return this.expenseService.getExpensesWithoutUpdate("expenses").pipe(
      map(expenses=>expenses.filter(expense=>new Date(expense.date).getFullYear() == this.yearSelection)),
      map(expenses=>expenses.filter(expense=>expense.category == category.id)),
      map(expenses=>expenses.sort((a,b)=>b.amount - a.amount)),
      map(expenses=>expenses.splice(0,20))
    )
  }



  initializeCategoryPieChart() {
    this.tempCategoriesSorted = this.stats.categoryMonthsData.map(el => {
      let category = this.categoryService.getCategoryFromId(el.category);
      let amount= Math.round(el.monthsData.reduce((acc, cur) => acc += cur.total, 0));
      let percentage = (Math.round(amount* 100 /this.stats.total))
      return { category, amount, percentage }
    }).sort((a, b) => b.amount - a.amount);

    // this.tempCategoriesSortedForLegend = this.tempCategoriesSorted.reduce((acc,cur, index)=>{
    //   let arrayLength = this.tempCategoriesSorted.length - 1;

    // },[])

    let values = this.tempCategoriesSorted.map(el => [`${el.category.name} ${(Math.round(el.amount* 100 /this.stats.total))}%`, el.amount]);
    let colors = this.tempCategoriesSorted.map(el => el.category.color);

    this.categoryPieChartOptions = {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: 0,
        plotShadow: false,
        height: 220,
        backgroundColor: 'transparent'
      },
      credits: {
        enabled: false
      },
      title: {
        text: ''
      },
      tooltip: {
        enabled: false,
      },
      plotOptions: {
        pie: {
          colors: colors,
          allowPointSelect: false,
          dataLabels: {
            enabled: false,
          },
          showInLegend: false,
          center: ['50%', '83%'],
          size: '50%',
          startAngle: -90,
          endAngle: 90,
        },
        series: {
          enableMouseTracking: false,
          point: {
            events: {
              legendItemClick: function () {
                return false // <== returning false will cancel the default action
              },
            }
          }
        }
      },
      series: [{
        type: 'pie',
        name: 'Browser share',
        //innerSize: '50%',
        innerSize: '35%',
        size: '185%',
        data: values
      }],
    };
  }


}
