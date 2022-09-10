import { Component, OnDestroy, OnInit } from '@angular/core';
import { ExpenseService, Expense } from 'src/app/services/expenses/expense.service';
import { Observable, combineLatest, Subject, BehaviorSubject } from 'rxjs';
import { FilterService, ExpenseFilter, MonthYear } from 'src/app/services/filter/filter.service';
import { isWithinInterval, subDays, addMonths, subMonths } from "date-fns";
import { CategoryService, Category } from 'src/app/services/category/category.service';
import * as Highcharts from 'highcharts';
import { map, switchMap, switchMapTo, shareReplay, filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { GroupsService } from 'src/app/services/groups/groups.service';
import { HttpClient } from '@angular/common/http';

interface CategoryTotal {
  category: Category;
  amount: number;
}

interface ChartData {
  data: { x: number, y: number }[];
  chartStartDate: number;
  currentMonthIndex: number;
}


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit, OnDestroy {

  constructor(
    public expenseService: ExpenseService,
    public filterService: FilterService,
    public categoryService: CategoryService,
    public groupService: GroupsService,
  ) { }

  private subs: Subscription[] = [];

  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};

  private expenses$: Observable<Expense[]>;
  public currentFilter$: BehaviorSubject<ExpenseFilter>;
  public monthSwitched$: BehaviorSubject<MonthYear>;
  public sortMethod$: BehaviorSubject<string>;
  public limitedCategory$: BehaviorSubject<Category>;
  public manualUpdate$: BehaviorSubject<void> = new BehaviorSubject(undefined);

  public expenses: Expense[];
  public totalAmount: number = 0;
  public totalCategories: CategoryTotal[];
  public collapseNotifier: Subject<void> = new Subject();
  public chartData;
  public initialFocus: string;

  ngOnInit(): void {
    this.expenses$ = this.expenseService.getExpenses("expenses").pipe(filter(expenses=>expenses.length>0));
    this.currentFilter$ = this.filterService.getFilter();
    this.monthSwitched$ = this.filterService.monthSwitched$;
    this.sortMethod$ = this.filterService.sortMethod$;
    this.limitedCategory$ = new BehaviorSubject(null);
    let allCategories$ = this.categoryService.getCategoriesNew().pipe(
      filter(categroies=>categroies.length>0)
    );

    this.currentFilter$.subscribe(()=>{
      this.activeCategory= null;
    })

    this.monthSwitched$.subscribe(()=>{
      this.activeCategory= null;
    })

    let sub1 = combineLatest(this.currentFilter$, this.expenses$, this.monthSwitched$, this.sortMethod$, this.limitedCategory$,allCategories$,this.manualUpdate$)
      .subscribe(([currentFilter, expenses, monthSwitch, sortMethod, limitedCategory, allCategories]) => {
        let filtered = expenses.filter((expense) => {
          return this.matchesFilter(expense, currentFilter, monthSwitch)
        });
        // start edit loop

        if (sortMethod == "amount") {
          this.expenses = filtered.reverse().sort(this.filterService.amountSorter);
        } else {
          this.expenses = filtered.reverse().sort((a, b) => this.filterService.dateSorter(a.date, b.date));
        }

        // If category limited only view expenses mathihc this category, but dont actually filter like emitting a new expense value. just change the view. Leave category-totals untouched
        if (limitedCategory) {
          this.expenses = this.expenses.filter(expense => {
            return this.categoryService.getCategoryFromId(expense.category).id == limitedCategory.id;
          })
        }

        this.totalAmount = filtered.reduce((acc, cur) => {
          return acc + cur.amount
        }, 0);

        let temp: CategoryTotal[] = filtered.reduce((acc, cur) => {
          let categoryMatch = acc.find(element => element.category.id === cur.category);
          if(categoryMatch === undefined){
            // if expense doesnt belong to any known category, accumulate its cost onto the "unassigned" category
            acc.find(element => element.category.name === 'unassigned').amount += cur.amount;
          }else{
            categoryMatch.amount += cur.amount;
          }
          return acc;
        }, allCategories.map(category => {
          return { category: category, amount: 0 }
        }));

          this.totalCategories = temp.filter((item) => {
            return item.amount > 0;
          }).sort((a, b) => {
            return b.amount - a.amount;
          });
    });

    let sub2 = this.calculateChartData().subscribe((options) => {
      if (options) {
        this.chartData = [...options.data].reverse().splice(1).filter((element) => {
          return element.y > 0
        });
        this.drawChart(options);
      }
    });

    this.subs.push(sub1)
    this.subs.push(sub2)
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub=>{
      sub.unsubscribe()
    })
  }

  chartOpened = false;
  toggleChart() {
    this.chartOpened = !this.chartOpened
  }


  /**
   * Since the chart starts with 5 entries and scroll position equals left border, we want
   * the scroll position to be in the middle of the chart
   * @param number: index of item in array
   */
  getNormalizedStartMonth(number: number) {
    if (number >= 3) {
      return number - 3;
    } else {
      return 0;
    }
  }

  public activeCategory = null;

  public toggleCategory(index: number, categoryTotal: CategoryTotal) {
    if (this.activeCategory == index) {
      this.activeCategory = null;
      this.limitedCategory$.next(null)
    } else {
      this.activeCategory = index;
      this.limitedCategory$.next(categoryTotal.category)
    }
  }

  private calculateChartData(): Observable<ChartData> {
    return combineLatest(this.expenses$, this.currentFilter$).pipe(
      map(([expenses, filter]) => {
        if (expenses.length > 0) {
          //TODO
        }
        // group all expensses in new object with accummulated amount
        let monthTotalsObject =
          expenses.filter((expense) => {
            let matches = false;
            if (filter.groups) {
              filter.groups.forEach(groupFilter => {
                if (!matches) {
                  matches = expense.group == groupFilter;
                }
              });
            } else {
              //no groups selected so all expenses valid
              matches = true;
            }
            return matches;
          }).reduce((acc, cur) => {
            let oldAmount = acc[cur.date.substring(0, 7)]?.amount ? acc[cur.date.substring(0, 7)]?.amount : 0;
            acc[cur.date.substring(0, 7)] = { ...acc[cur.date.substring(0, 7)], ...{ amount: oldAmount + cur.amount } }
            return acc;
          }, {});

        //sort groups by month and convert to array
        let monthTotalsSorted = this.monthTotalObjectToArray(monthTotalsObject).sort((a, b) => {
          return new Date(a.month).getTime() - new Date(b.month).getTime()
        }).filter(el => {
          return new Date(el.month) <= new Date()
        });
        if (monthTotalsSorted.length > 0) {

          let filledTotals: { month: string, amount: number }[] = [];
          let firstMonth = new Date(monthTotalsSorted[0].month);
          let lastMonth = new Date();
          for (let month = firstMonth; month <= lastMonth; month = addMonths(month, 1)) {
            let monthString = this.filterService.getMonthDateString(month)
            filledTotals.push({ month: monthString, amount: 0 });
          }

          // Now fill in the amounts calculated in monthTotalsSorted
          monthTotalsSorted.forEach(monthTotal => {
            let indexForFilled = filledTotals.findIndex(el => {
              return el.month === monthTotal.month
            });
            filledTotals[indexForFilled].amount = monthTotal.amount;
          });


          // reduce to array of just amounts for chart
          let chartData = filledTotals.map(el => {
            return { x: Date.UTC(new Date(el.month).getFullYear(), (new Date(el.month).getMonth()), 1), y: el.amount }
          });

          chartData.push({ x: Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 0), y: null })

          let currentIndex = filledTotals.findIndex(el => {
            return el.month === this.filterService.getCurrentMonthFilter()
          });

          return {
            data: chartData,
            chartStartDate: Date.UTC(new Date(filledTotals[0].month).getFullYear(), new Date(filledTotals[0].month).getMonth(), 0),
            currentMonthIndex: currentIndex
          }
        }
        //create new array with all of the months from begin to finish adn initialize for chart with null
      })
    )
  }

  private drawChart(chartData: ChartData) {
    this.chartOptions = {
      title: {
        text: null,
        style: {
          color: '#272727'
        }
      },
      tooltip: { enabled: false },
      chart: {
        backgroundColor: "#eee",
        animation: false,
        scrollablePlotArea: {
          minWidth: chartData.data.length * 50, //amountOfEntries *50px
          opacity: 0.9,
          scrollPositionX: (1 / (chartData.data.length - 5)) * this.getNormalizedStartMonth(chartData.currentMonthIndex) // 1/ amountOfEntries * startMonth from begin ignoring 5 first entries
        }
      },
      plotOptions: {
        line: {
          animation: false,
          pointStart: chartData.chartStartDate,
          // pointInterval: 24 * 3600 * 1000 * 30
        },
        series: {
          states: {
            hover: {
              enabled: false
            }
          }
        }
      },
      legend: {
        enabled: false
      },
      xAxis: {
        min: chartData.chartStartDate,
        allowDecimals: false,
        type: 'datetime',
        tickInterval: 30 * 24 * 3600 * 1000, //one month
        labels: {
          // rotation: 90,
          // align: "left",
          overflow: 'justify'
        },
        crosshair: {
          width: 0
        },
      },
      yAxis: {
        opposite: false,
        gridLineColor: "#ccc",
        min: 0,
        title: {
          text: null
        },
        labels: {
          formatter: function () {
            return this.value + "€"
          }
        }
      },
      colors: ["#444"],
      series: [{
        data: chartData.data,
        type: 'line',
        softThreshold: true
      }]
    };
  }

  private monthTotalObjectToArray(obj: any): { month: string, amount: number }[] {
    return Object.keys(obj).map(key => {
      return { month: key, amount: obj[key].amount }
    });
  }

  public investFilterActive: boolean = localStorage.getItem('investRestrictionActive')=='true' || false;

  public toggleInvestRestriction(){
    this.investFilterActive = !this.investFilterActive;
    localStorage.setItem('investRestrictionActive',this.investFilterActive+ "");
    this.manualUpdate$.next();
  }

  private matchesFilter(expense: Expense, filter: ExpenseFilter, monthSwitch: MonthYear): boolean {
    let matches = true;
    let expenseYear = expense.date.substring(0, 4);
    let expenseMonth = expense.date.substring(5, 7);
    if (monthSwitch) {
      matches = expenseYear == monthSwitch.year && expenseMonth == monthSwitch.month;
    } else {
      if (filter.date) {
        matches = expenseYear == filter.date.year && expenseMonth == filter.date.month;
      } else {
        //take all data change nothing...BUT if last30Days then
        if (filter.last30Active) {
          //leading zeros lead to wrong time for the Date. FIXME: Dirty solution
          let expenseDate = new Date(new Date(expense.date).getFullYear(), new Date(expense.date).getMonth(), new Date(expense.date).getDate());
          matches = isWithinInterval(expenseDate, { start: subDays(new Date(), 30), end: new Date() })
        }
      }
    }

    if (matches && filter.groups) {
      // Because it makes sense when only setting the group "North America" we also want to include all its subgroups and tbeir nested subgroups
      let relevantGroups = filter.groups.reduce((acc,cur)=>{
        let group = this.groupService.getGroupById(cur)
        acc.push(group);
        if(group.subgroups?.length>0){
          acc.push(...this.groupService.getSubgroupsRecursive(group))
        }
        return acc;
      },[])

      let matchesInternal = false;
      //OR-comparison, true if one of the filters is true
      relevantGroups.forEach(groupFilter => {
        if (!matchesInternal) {
          matchesInternal = expense.group == groupFilter.id;
        }
      })
      matches = matchesInternal;
    }

    let excludeInvestExpenses = localStorage.getItem('investRestrictionActive')=='true';
    if(expense.category == 1638217648875 && excludeInvestExpenses){
      matches = false;
    }

    return matches
  }
}
