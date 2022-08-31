import { Component, OnInit, OnDestroy } from '@angular/core';
import { SliderService } from 'src/app/services/slider/slider.service';
import { GroupsService, Group, GroupTotal, Subgroup } from 'src/app/services/groups/groups.service';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { ExpenseService, Expense } from 'src/app/services/expenses/expense.service';
import { FilterService } from 'src/app/services/filter/filter.service';
import { transition, trigger, state, style, animate } from '@angular/animations';
import { differenceInDays } from 'date-fns';
import { Router } from '@angular/router';

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

    this.subscription = combineLatest(this.expenses$, this.groups$).subscribe(([expenses, groups]) => {
      if(expenses.length>0 && groups.length>0){
        this.groupsTotals = this.calculateGroupsTotals(expenses, groups);
        this.allTotals = {duration:1, amount:2} /*this.groupsTotals.map((el) => {
          return el.groupTotal.reduce((acc, cur) => {
            if(!cur.duration){
              return acc;
            }
            return { duration: acc.duration + cur.duration, amount: acc.amount + cur.amount }
          }, { duration: 0, amount: 0 })
        }).reduce((acc, cur) => {
          return { duration: acc.duration + cur.duration, amount: acc.amount + cur.amount }
        });*/
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

  /**
   * searches in an array of groups for a specific group by ID including recursively deep search
   */
  getGroupMatchRecursively(groups: Group[], id: number): Group | Subgroup {
    let match = undefined;
    groups.forEach(group => {
      if(group.id == id){
        match= group;
        return;
      };
      if(group.subgroups?.length>0){
        let subgroupMatch = this.getGroupMatchRecursively(group.subgroups, id);
        if(subgroupMatch){
          match= subgroupMatch;
          return;
        }
      }else{
        return;
        // go to next (parent) group
      }
    });

    return match; // should never happen
  }

  calculateGroupsTotals(expenses: Expense[], groups_origin: Group[]): GroupTotal[] {
    //new code

    /**   at first all expenses are just added nested into the deepest matcgh, jnot accumulkating the amount for the parent,
     * so "north america" diesnt get the "GDT" amounts yet, so that we dont have to find each childs parent recursively to the top every time we add someting
     *
     * After all is done we can recursively add the totals to all parents bubelling upwards
     */
    expenses.forEach(expense=>{
      let expenseGroup = expense.group;
      if(expenseGroup !== 0){
        let match: {amount: number, firstExpenseDate: string, lastExpenseDate: string, durationInDays?: number, name: string, id: number, subgroups?: Subgroup[]}= this.getGroupMatchRecursively(groups_origin, expenseGroup) as any;

        if(!match){
          alert("Gruppe von expense konnte nicht zugeordnet werden")
        }

        if(!match.amount){
          match.amount = expense.amount;
        }else{
          match.amount += expense.amount;
        }

        if(!match.firstExpenseDate){
          match.firstExpenseDate = expense.date;
        }else{
          if(new Date(match.firstExpenseDate)> new Date(expense.date)){
            match.firstExpenseDate = expense.date
          }
        }

        if(!match.lastExpenseDate){
          match.lastExpenseDate = expense.date;
        }else{
          if(new Date(match.lastExpenseDate)< new Date(expense.date)){
            match.lastExpenseDate = expense.date
          }
        }
      }
    });


    let totals: GroupTotal[]= groups_origin.map(el=>{
      (el as any).durationInDays = differenceInDays(new Date((el as any).lastExpenseDate), new Date((el as any).firstExpenseDate )) +1;
      return el as any
    });

    let sorted = totals.sort((a, b) => this.filterService.dateSorter(a.firstExpenseDate, b.firstExpenseDate))

    return sorted;
  }

  public currentlyOpenIndex : number = undefined

  toggleHelpMenu(index: number): void {
    if(this.currentlyOpenIndex == index){
      this.currentlyOpenIndex= undefined
    }else{
      this.currentlyOpenIndex = index
    }
  }
}
