import { Component, OnInit, OnDestroy } from '@angular/core';
import { SliderService } from 'src/app/services/slider/slider.service';
import { GroupsService, Group, GroupTotal, Subgroup } from 'src/app/services/groups/groups.service';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { ExpenseService, Expense } from 'src/app/services/expenses/expense.service';
import { FilterService } from 'src/app/services/filter/filter.service';
import { transition, trigger, state, style, animate } from '@angular/animations';
import { differenceInDays } from 'date-fns';
import { Router } from '@angular/router';
import { distinctUntilChanged } from 'rxjs/operators';
import { numberFormat } from 'highcharts';

type GroupTotalCollections = {
  type: string;
  groupTotal: GroupTotal[];
}

@Component({
  selector: 'app-groups',
  animations: [
    trigger('slideInOut', [
      state('out', style({
        opacity: '0',
        overflow: 'hidden',
        height: '0px',
        margin: '0px'
      })),
      state('in', style({
        opacity: '1',
        overflow: 'hidden',
        height: '*',
        margin: '12px 0 0 0'
      })),
      transition('out => in', animate('150ms ease-in-out')),
      transition('in => out', animate('150ms ease-in-out'))
    ])
  ],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.less']
})
export class GroupsComponent implements OnInit, OnDestroy {

  constructor(
    public sliderService: SliderService,
    public groupsService: GroupsService,
    public expenseService: ExpenseService,
    private filterService: FilterService,
    private router: Router
  ) { }

  public groups$: Observable<Group[]>
  public expenses$: Observable<Expense[]>;
  private subscription: Subscription;
  public groupsTotals: GroupTotal[];
  public allTotals: { duration: number, amount: number };

  ngOnInit(): void {
    this.groups$ = this.groupsService.getGroups();
    this.expenses$ = this.expenseService.getExpenses("expenses")

    this.subscription = combineLatest(this.expenses$, this.groups$).pipe(distinctUntilChanged()).subscribe(([expenses, groups]) => {
      if(expenses.length>0 && groups.length>0){
        var clonedGroups = JSON.parse(JSON.stringify(groups));
        this.groupsTotals = this.groupsService.calculateGroupsTotals(expenses, clonedGroups);

        let tempAllTotals = expenses.reduce((acc,cur)=>{
          acc.amount+=cur.amount;
          if(new Date(cur.date)<acc.firstDate || !acc.firstDate){
            acc.firstDate = new Date(cur.date)
          };
          if(new Date(cur.date)>acc.lastDate || !acc.lastDate){
            acc.lastDate = new Date(cur.date)
          };
          return acc;
        },{firstDate: undefined, lastDate: undefined, amount: 0, duration:0});
        tempAllTotals.duration =  differenceInDays(tempAllTotals.lastDate, tempAllTotals.firstDate);
        this.allTotals = tempAllTotals;
      }
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Shows a expense list just like on home for this group. Opens a slighly modified "home" site with a "x" button to reset the site to its former state
   */
  showDetailList(groupId: number){
    this.filterService.setFilter(
      {
        temporaryFilter: true,
        groups: [groupId]
      }
    )
    this.router.navigate(['/home']);
  }


  public currentlyOpenIndex : number = undefined; //FIEMX change to undefiend

  toggleHelpMenu(index: number): void {
    if(this.currentlyOpenIndex == index){
      this.currentlyOpenIndex= undefined
    }else{
      this.currentlyOpenIndex = index
    }
  }

}
