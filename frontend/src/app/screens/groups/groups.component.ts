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
        this.groupsTotals = this.calculateGroupsTotals(expenses, clonedGroups);

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
      if(el.subgroups?.length>0){
        el.subgroups = this.addDurationRecursive(el.subgroups);
      }
      return el as any
    });

    (groups_origin as GroupTotal[]).forEach((group)=>{
      this.mutateTotalFromSubgroups(group);
    });

    let sorted = totals.sort((a, b) => this.filterService.dateSorter(a.firstExpenseDate, b.firstExpenseDate))

    return sorted;
  }

  public currentlyOpenIndex : number = undefined; //FIEMX change to undefiend

  toggleHelpMenu(index: number): void {
    if(this.currentlyOpenIndex == index){
      this.currentlyOpenIndex= undefined
    }else{
      this.currentlyOpenIndex = index
    }
  }

  addDurationRecursive(groups: Group[]): Group[]{
      return groups.map(el=>{
        (el as any).durationInDays = differenceInDays(new Date((el as any).lastExpenseDate), new Date((el as any).firstExpenseDate));
        if(el.subgroups?.length>0){
          el.subgroups = this.addDurationRecursive(el.subgroups)
        }
        return el;
      })
    }

    /**
     * Changes a groups total according to its child groups, takes nested subgroups into account thus calls itself recursively
     *
     * Does actually mutate all data inside, so the base object is gonna be formatted
     */
    mutateTotalFromSubgroups(group: GroupTotal){
      if(group.subgroups?.length>0){
        let total: number = group.subgroups.reduce((acc,cur)=>{
          if(cur.subgroups?.length==0){
            acc+=cur.amount; // TODO: maybe also alter date/duration of parent? ! should actually do that : FIXME
          }else{
            // has nested subgroup --> mutate their total
            this.mutateTotalFromSubgroups(cur); // before adding up the current subgroups amount we need to mutat its own total since it has subgroups itself
            acc+= cur.amount;
          }
          return acc;
        },0);
        group.amount += total;
      }else{
        return group.amount; // no mutation needed, already correct
      }
    }

}
