import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ɵclearResolutionOfComponentResourcesQueue } from '@angular/core';
import { differenceInDays } from 'date-fns';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, take } from 'rxjs/operators';
import { Category, CategoryService } from 'src/app/services/category/category.service';
import { Expense, ExpenseService } from 'src/app/services/expenses/expense.service';
import { GroupsService } from 'src/app/services/groups/groups.service';
import * as Highcharts from 'highcharts';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseListDialogComponent } from '../expense-list-dialog/expense-list-dialog.component';
import { combineLatest } from 'rxjs';
import { AnalysisService } from 'src/app/services/analysis/analysis.service';
import { BehaviorSubject } from 'rxjs';
import { skip } from "rxjs/operators";


type Stats = {
  amountOfDays: number,
  averagePerMonth: number,
  averagePerYear: number,
  averagePerDay: number,
  total: number, // inirial calculation
  totalRecurring: number, // initial calc
  totalTravel: number, // inirial calculation
  totalNonTravel: number, // initial calc
  totalSinceInvest: number,
  totalWasted: number,
  totalSpecial: number,
  totalInvest: number,
  yearsData: {
    year: number, // initial calc
    firstDate: Date,// initial calc
    lastDate: Date,// initial calc
    amountInDays: number,
    total: number,// initial calc
    totalSpecial: number,
    totalInvest: number,
    totalRecurring: number,// initial calc
    averagePerMonth: number,
  }[],
  categoryYearsData: {
    category: number,
    total: number,
    totalSpecial: number,
    totalInvest: number,
    firstDate: Date,
    lastDate: Date,
    amountOfDays: number,
    data: {
      year: number,
      total: number,// initial calc
      totalSpecial: number,
      totalInvest: number,
    }[]
  }[]
}

export type Restriction = "no-special" | "no-special-no-invest" | "none" | "no-invest";

@Component({
  selector: 'app-all-time-analysis',
  templateUrl: './all-time-analysis.component.html',
  styleUrls: ['./all-time-analysis.component.less']
})
export class AllTimeAnalysisComponent implements OnInit, OnDestroy {

  public selectedRestriction$: BehaviorSubject<Restriction> = new BehaviorSubject(this.analysisService.getInitialRestriction() || "none");

  @Input() set initialRestriction(restriction: Restriction) {
    if(restriction){
      this.selectedRestriction$.next(restriction);
      this.restrictionSelected = restriction;
      this.filtersChanged()
    }
  }


  @Output() tabChanged = new EventEmitter<{year: number, restriction: Restriction}>();

  constructor(
    private expenseService: ExpenseService,
    public categoryService: CategoryService,
    public analysisService: AnalysisService,
    public dialog: MatDialog,
  ) { }

  public expenses$: Observable<Expense[]>;
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};
  categoryPieChartOptions: Highcharts.Options = {}
  chartReady: boolean = false;

  categorySelected: number = 0;
  public categories$: Observable<Category[]>;
  restrictionSelected: Restriction;
  restrictions: string[] = ["none", "no-special", "no-special-no-invest", "no-invest"]
  updateFlag: boolean = false;
  tempCategoriesSorted: { category: Category, amount: number, percentage?: number }[];
  tempCategoriesSortedForLegend: { category: Category, amount: number, percentage?: number }[];

  averagePerYear: number;
  averagePerMonth: number;
  averagePerDay: number;
  averageTotal: number;

  // this Construct is the exact result of all of the expenses and gets build so its easier for the template and charts to display.
  //Everything thats needed is already pre-calculated in here
  public stats: Stats;
  private subs: Subscription[] = [];


  ngOnInit(): void {
    let initialRestriction = this.analysisService.getInitialRestriction();

    this.restrictionSelected = initialRestriction;

    this.analysisService.getInitialCategory().subscribe((category)=>{
      this.categorySelected = parseInt(category)
      this.filtersChanged();
    })

    this.restrictionSelected = this.analysisService.getInitialRestriction();
    this.categories$ = this.categoryService.getCategoriesNew().pipe(
      filter(categories => categories.length > 0),
      map(categories => categories.filter(category => category.name !== 'unassigned'))
    );

    this.analysisService.getInitialCategory().subscribe(category=>{
      this.categorySelected = parseInt(category);
      this.filtersChanged();
    })

    this.expenses$ = this.expenseService.getExpenses("expenses").pipe(
      filter(expenses => expenses.length > 0),
      distinctUntilChanged(),
      take(1));

      this.selectedRestriction$.pipe(skip(1)).subscribe((restriction)=>{
        this.restrictionSelected = restriction;
        this.filtersChanged();
      })

    let sub = combineLatest([this.expenses$, this.categories$]).subscribe(([expenses]) => {
      this.stats = {
        amountOfDays: 0,
        averagePerMonth: 0,
        averagePerYear: 0,
        averagePerDay: 0,
        categoryYearsData: [],
        total: 0,
        totalRecurring: 0,
        yearsData: [],
        totalNonTravel: 0,
        totalTravel: 0,
        totalSinceInvest: 0,
        totalWasted: 0,
        totalSpecial: 0,
        totalInvest: 0,
      }
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
          if (expense.recurring) {
            this.stats.totalRecurring += expense.amount;
          }

          // years total
          let expenseYear: number = new Date(expense.date).getFullYear();
          let yearsDataMatch = this.stats.yearsData.find(el => el.year === expenseYear);
          if (!yearsDataMatch) {
            this.stats.yearsData.push({ year: expenseYear, total: 0, totalRecurring: 0, averagePerMonth: 0, amountInDays: null, firstDate: null, lastDate: null, totalSpecial: 0, totalInvest: 0 });
          }
          yearsDataMatch = this.stats.yearsData.find(el => el.year === expenseYear);
          yearsDataMatch.total += expense.amount;
          if (expense.tags.indexOf(1640542478507) >= 0 || expense.tags.indexOf(1639339361128) >= 0) {
            // special-expense tag
            yearsDataMatch.totalSpecial += expense.amount;

          }
          if (expense.category == 1638217648875) {
            // invest category
            yearsDataMatch.totalInvest += expense.amount;
            this.stats.totalInvest += expense.amount;
          }


          if (!yearsDataMatch.firstDate) {
            yearsDataMatch.firstDate = new Date(expense.date);
          }
          if (!yearsDataMatch.lastDate) {
            yearsDataMatch.lastDate = new Date(expense.date);
          }

          if (new Date(expense.date) < yearsDataMatch.firstDate) {
            yearsDataMatch.firstDate = new Date(expense.date);
          }

          if (new Date(expense.date) > yearsDataMatch.lastDate) {
            yearsDataMatch.lastDate = new Date(expense.date);
          }

          if (expense.recurring) {
            yearsDataMatch.totalRecurring += expense.amount;
          }

          if (expense.tags.indexOf(1638199877164) >= 0) {
            this.stats.totalTravel += expense.amount;
          }
          if (expense.tags.indexOf(1638199880620) >= 0) {
            // travel tag
            this.stats.totalNonTravel += expense.amount;
          }

          if (expense.tags.indexOf(1638551935130) >= 0) {
            // wasting tag
            this.stats.totalWasted += expense.amount;
          }
          if (expense.tags.indexOf(1640542478507) >= 0 || expense.tags.indexOf(1639339361128) >= 0) {
            // special-expense tag
            this.stats.totalSpecial += expense.amount;
          }

          if (new Date(expense.date) > new Date('2021-01-01')) {
            this.stats.totalSinceInvest += expense.amount;
          }

          // years categroy totals
          let expenseCategory: number = expense.category;
          // find the category stats object whch matches the expenses category
          let yearsCategoryMatch = this.stats.categoryYearsData.find(el => el.category === expenseCategory);
          if (!yearsCategoryMatch) {
            this.stats.categoryYearsData.push({ category: expenseCategory, data: [], total: 0, amountOfDays: 0, firstDate: new Date(expense.date), lastDate: new Date(expense.date), totalSpecial: 0, totalInvest: 0 });
          }
          yearsCategoryMatch = this.stats.categoryYearsData.find(el => el.category === expenseCategory);
          let yearsCategoryDataMatch = yearsCategoryMatch.data.find(el => el.year == expenseYear);
          if (!yearsCategoryDataMatch) {
            yearsCategoryMatch.data.push({ total: 0, year: expenseYear, totalSpecial: 0, totalInvest: 0 });
          }
          yearsCategoryDataMatch = yearsCategoryMatch.data.find(el => el.year == expenseYear);
          yearsCategoryDataMatch.total += expense.amount;
          if (expense.tags.indexOf(1640542478507) >= 0 || expense.tags.indexOf(1639339361128) >= 0) {
            // special-expense tag
            yearsCategoryDataMatch.totalSpecial += expense.amount;
            yearsCategoryMatch.totalSpecial += expense.amount;
          }
          if (expense.category == 1638217648875) {
            // investcategory
            yearsCategoryDataMatch.totalInvest += expense.amount;
            yearsCategoryMatch.totalInvest += expense.amount;
          }
          yearsCategoryMatch.total += expense.amount
          let expenseDate = new Date(expense.date);
          if (yearsCategoryMatch.firstDate > expenseDate) {
            yearsCategoryMatch.firstDate = expenseDate
          }
          if (yearsCategoryMatch.lastDate < expenseDate) {
            yearsCategoryMatch.lastDate = expenseDate
          }
        }
      });

      this.stats.amountOfDays = differenceInDays(new Date(), firstDate); // new Date() insead of lastDate because once a category is created its vonsidered to exist permanent, lastDate would false (if last investment is 6 months back those 6 wont show in the amount of days, but should be considered)
      this.averageTotal = Math.round(this.stats.total);
      this.stats.totalTravel = Math.round(this.stats.totalTravel);

      this.stats.averagePerDay = Math.round(this.stats.total / this.stats.amountOfDays);
      this.stats.averagePerYear = Math.round(this.stats.averagePerDay * 365);
      this.stats.averagePerMonth = Math.round(this.stats.averagePerDay * 30.437); // average month = 30.437
      this.averagePerYear = this.stats.averagePerYear;
      this.averagePerMonth = this.stats.averagePerMonth;
      this.averagePerDay = this.stats.averagePerDay;

      this.stats.yearsData.forEach(yearData => {
        yearData.amountInDays = differenceInDays(yearData.lastDate, yearData.firstDate);
        yearData.averagePerMonth = (yearData.total / yearData.amountInDays) * 30.437;
      });

      this.stats.categoryYearsData.forEach(categoryData => {
        categoryData.amountOfDays = differenceInDays(new Date(), categoryData.firstDate) + 1 // 3.dec - 3.dec = 0, but should be 1
        categoryData.total = Math.round(categoryData.total);
      });

      this.initializeChart();
      this.initializeCategoryPieChart();
      this.filtersChanged();
    });
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe())
  }


  private initializeChart() {

    let years: string[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

    let values: number[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total));

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
        categories: years,
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
          cursor: 'pointer',
          events: {
            click: (event) => {
              this.yearClicked(parseInt(event.point.category))
            }
          },
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
          data: values,
          dataLabels: {
            inside: false,
            crop: false,
            overflow: 'allow',
          }
        }]
    };

    this.chartReady = true; // needed so template doesnt try to initialize before its ready because it gets initialized asynchronously in subscribtion of expenses$
  }

  getComparisonValues(): {
    regular: number;
    recurring: number;
    travel: number;
    nonTravel: number;
    invest: number;
    nonInvest: number;
  } {
    let result = {
      regular: 0,
      recurring: 0,
      travel: 0,
      nonTravel: 0,
      invest: 0,
      nonInvest: 0,
    }

    switch (this.restrictionSelected) {
      case "none":
        result.regular = ((this.stats.total - this.stats.totalRecurring) / this.stats.amountOfDays) * 30.437;
        result.recurring = (this.stats.totalRecurring / this.stats.amountOfDays) * 30.437;
        result.travel = (this.stats.totalTravel / this.stats.amountOfDays) * 365;
        result.nonTravel = (this.stats.totalNonTravel / this.stats.amountOfDays) * 365;
        result.invest = this.getAverageValues(1638217648875).year;
        result.nonInvest = ((this.stats.totalSinceInvest - this.getCategoryStats(1638217648875).total) / this.getCategoryStats(1638217648875).amountOfDays) * 365;
        break;
      case "no-special":
        result.regular = ((this.stats.total - this.stats.totalRecurring- this.stats.totalSpecial) / this.stats.amountOfDays) * 30.437;
        result.recurring = (this.stats.totalRecurring / this.stats.amountOfDays) * 30.437;
        result.travel = (this.stats.totalTravel / this.stats.amountOfDays) * 365;
        result.nonTravel = (this.stats.totalNonTravel / this.stats.amountOfDays) * 365;
        result.invest = this.getAverageValues(1638217648875).year;
        result.nonInvest = ((this.stats.totalSinceInvest - this.getCategoryStats(1638217648875).total - this.stats.totalSpecial) / this.getCategoryStats(1638217648875).amountOfDays) * 365;
        break;
      case "no-special-no-invest":
        result.regular = ((this.stats.total - this.stats.totalRecurring- this.stats.totalSpecial) / this.stats.amountOfDays) * 30.437;
        result.recurring = (this.stats.totalRecurring / this.stats.amountOfDays) * 30.437;
        result.travel = (this.stats.totalTravel / this.stats.amountOfDays) * 365;
        result.nonTravel = (this.stats.totalNonTravel / this.stats.amountOfDays) * 365;
        result.invest = this.getAverageValues(1638217648875).year;
        result.nonInvest = ((this.stats.totalSinceInvest - this.getCategoryStats(1638217648875).total - this.stats.totalSpecial) / this.getCategoryStats(1638217648875).amountOfDays) * 365;
        break;
      case "no-invest":
        result.regular = ((this.stats.total - this.stats.totalRecurring) / this.stats.amountOfDays) * 30.437;
        result.recurring = (this.stats.totalRecurring / this.stats.amountOfDays) * 30.437;
        result.travel = (this.stats.totalTravel / this.stats.amountOfDays) * 365;
        result.nonTravel = (this.stats.totalNonTravel / this.stats.amountOfDays) * 365;
        result.invest = this.getAverageValues(1638217648875).year;
        result.nonInvest = ((this.stats.totalSinceInvest - this.getCategoryStats(1638217648875).total) / this.getCategoryStats(1638217648875).amountOfDays) * 365;
        break;

      default:
        break;
    }

    return result;
  }

  filtersChanged() {
    if (this.categorySelected == 0) {
      // TODO: differentiate between restrictions
      switch (this.restrictionSelected) {
        case "none": {
          this.initializeChart();
          this.averageTotal = Math.round(this.stats.total)
          this.averagePerYear = this.stats.averagePerYear;
          this.averagePerMonth = this.stats.averagePerMonth;
          this.averagePerDay = this.stats.averagePerDay;
        }
          break;
        case "no-special": {
          let years: string[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total - el.totalSpecial));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: '#444444',
              type: 'column',
              data: values
            }
          ]

          this.averageTotal = Math.round(this.stats.total - this.stats.totalSpecial)
          this.averagePerDay = this.averageTotal / this.stats.amountOfDays;
          this.averagePerMonth = this.averagePerDay * 30.437;
          this.averagePerYear = this.averagePerDay * 365;
        }

          break;
        case "no-special-no-invest": {
          let years: string[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total - el.totalSpecial - el.totalInvest));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: '#444444',
              type: 'column',
              data: values
            }
          ]

          this.averageTotal = Math.round(this.stats.total - this.stats.totalSpecial - this.stats.totalInvest)
          this.averagePerDay = this.averageTotal / this.stats.amountOfDays;
          this.averagePerMonth = this.averagePerDay * 30.437;
          this.averagePerYear = this.averagePerDay * 365;
        }
          break;
        case "no-invest": {
          let years: string[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.yearsData.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total - el.totalInvest));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: '#444444',
              type: 'column',
              data: values
            }
          ]

          this.averageTotal = Math.round(this.stats.total - this.stats.totalInvest)
          this.averagePerDay = this.averageTotal / this.stats.amountOfDays;
          this.averagePerMonth = this.averagePerDay * 30.437;
          this.averagePerYear = this.averagePerDay * 365;
        }
        break;
        default:
          alert("unhandled restricion case")
          break;
      }
    } else {
      // a specific category has been chosen
      switch (this.restrictionSelected) {
        case "none": {
          let selectedCategory: Category = this.categoryService.getCategoryFromId(this.categorySelected);
          let averageValues = this.getAverageValues(selectedCategory.id);
          this.averageTotal = averageValues.total
          this.averagePerYear = averageValues.year;
          this.averagePerMonth = averageValues.month;
          this.averagePerDay = averageValues.day;

          let years: string[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: selectedCategory.color,
              type: 'column',
              data: values
            }
          ]
        }
          break;
        case "no-special": {
          let selectedCategory: Category = this.categoryService.getCategoryFromId(this.categorySelected);
          let averageValues = this.getAverageValues(selectedCategory.id);
          this.averageTotal = averageValues.total - averageValues.totalSpecial
          this.averagePerYear = this.averageTotal / averageValues.amountOfDays * 365;
          this.averagePerMonth = this.averageTotal / averageValues.amountOfDays * 30.437;;
          this.averagePerDay = this.averageTotal / averageValues.amountOfDays;


          let years: string[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total - el.totalSpecial));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: selectedCategory.color,
              type: 'column',
              data: values
            }
          ]
        }
          break;
        case "no-special-no-invest": {
          let selectedCategory: Category = this.categoryService.getCategoryFromId(this.categorySelected);
          let averageValues = this.getAverageValues(selectedCategory.id);
          this.averageTotal = averageValues.total - averageValues.totalSpecial - averageValues.totalInvest
          this.averagePerYear = this.averageTotal / averageValues.amountOfDays * 365;
          this.averagePerMonth = this.averageTotal / averageValues.amountOfDays * 30.437;;
          this.averagePerDay = this.averageTotal / averageValues.amountOfDays;

          let years: string[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total - el.totalSpecial - el.totalInvest));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: selectedCategory.color,
              type: 'column',
              data: values
            }
          ]
        }
        case "no-invest": {
          let selectedCategory: Category = this.categoryService.getCategoryFromId(this.categorySelected);
          let averageValues = this.getAverageValues(selectedCategory.id);
          this.averageTotal = averageValues.total - averageValues.totalInvest
          this.averagePerYear = this.averageTotal / averageValues.amountOfDays * 365;
          this.averagePerMonth = this.averageTotal / averageValues.amountOfDays * 30.437;;
          this.averagePerDay = this.averageTotal / averageValues.amountOfDays;

          let years: string[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => el.year.toString())

          let values: number[] = this.stats.categoryYearsData.find(el => el.category == selectedCategory.id).data.sort((a, b) => { return a.year - b.year }).map(el => Math.round(el.total - el.totalInvest));
          this.chartOptions.xAxis = {
            categories: years,
            crosshair: true
          }
          this.chartOptions.series = [
            {
              color: selectedCategory.color,
              type: 'column',
              data: values
            }
          ]
        }

          break;
        default:
          alert("unhandled restricion case")
          break;
      }

    }
    this.updateFlag = true;
  }

  yearClicked(year: number) {
    this.tabChanged.emit({year, restriction: this.restrictionSelected})
  }

  initializeCategoryPieChart() {
    this.tempCategoriesSorted = this.stats.categoryYearsData.map(el => {
      let category = this.categoryService.getCategoryFromId(el.category);
      let amount = Math.round(el.data.reduce((acc, cur) => acc += cur.total, 0));
      let percentage = (Math.round(amount * 100 / this.stats.total))
      return { category, amount, percentage }
    }).sort((a, b) => b.amount - a.amount);

    // this.tempCategoriesSortedForLegend = this.tempCategoriesSorted.reduce((acc,cur, index)=>{
    //   let arrayLength = this.tempCategoriesSorted.length - 1;

    // },[])

    let values = this.tempCategoriesSorted.map(el => [`${el.category.name} ${(Math.round(el.amount * 100 / this.stats.total))}%`, el.amount]);
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
          cursor: 'pointer',
          events: {
            click: (event) => {
              let index = event.point.colorIndex;
              this.categorySelectedFromLegend(this.tempCategoriesSorted[index].category);
            }
          },
          enableMouseTracking: true,
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

  public categoryChanged() {
    this.analysisService.setInitialCategory(this.categorySelected.toString())
    this.filtersChanged();
  }

  public restrictionChanged() {
    this.analysisService.setInitialRestriction(this.restrictionSelected)
    this.filtersChanged()
  }


  getAverageValues(categoryId: number): { total: number, totalSpecial: number, year: number, month: number, day: number, amountOfDays: number, totalInvest: number } {
    let categoryTotal = this.stats.categoryYearsData.find(el => el.category == categoryId);
    return {
      total: Math.round(categoryTotal.total),
      year: Math.round(categoryTotal.total / categoryTotal.amountOfDays * 365),
      month: Math.round(categoryTotal.total / categoryTotal.amountOfDays * 30.437),
      day: Math.round(categoryTotal.total / categoryTotal.amountOfDays),
      totalSpecial: Math.round(categoryTotal.totalSpecial),
      totalInvest: categoryTotal.totalInvest,
      amountOfDays: categoryTotal.amountOfDays,
    }
  }

  getCategoryStats(categoryId: number): {
    category: number,
    total: number,
    firstDate: Date,
    lastDate: Date,
    amountOfDays: number,
    data: {
      year: number,
      total: number,// initial calc
    }[]
  } {
    return this.stats.categoryYearsData.find(el => el.category == categoryId);
  }

  public getExpensesForCategory(category: Category): Observable<Expense[]> {
    return this.expenseService.getExpensesWithoutUpdate("expenses").pipe(
      map(expenses => expenses.filter(expense => expense.category == category.id)),
      map(expenses => expenses.sort((a, b) => b.amount - a.amount)),
      map(expenses => expenses.splice(0, 20))
    )
  }

  public categorySelectedFromLegend(category: Category) {
    let sub = this.getExpensesForCategory(category).subscribe(expenses => {
      let total = this.stats.categoryYearsData.find(el => el.category == category.id).total
      const dialogRef = this.dialog.open(ExpenseListDialogComponent, { data: { expenses: expenses, category: category, total } }); // add initial data here

      dialogRef.afterClosed().subscribe(result => {
        sub.unsubscribe()
      });
    })
    this.subs.push(sub)

  }
}
