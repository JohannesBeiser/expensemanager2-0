import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { addMonths, subMonths } from 'date-fns';
import { Expense } from '../expenses/expense.service';
import { Group } from '../groups/groups.service';

export interface MonthYear {
  /**
   * 1 being january
   */
  month: string;
  year: string;
}

export interface ExpenseFilter {
  groups?: number[];
  date?: MonthYear;
  last30Active?: boolean;
  temporaryFilter?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {

  public filterShown$: BehaviorSubject<boolean>;
  public filterState$: BehaviorSubject<ExpenseFilter>;
  public monthSwitched$: BehaviorSubject<MonthYear>
  public sortMethod$: BehaviorSubject<string>

  //Used for saving the current filter and re using it after a temrprary filter has been applied
  public temporaryFilterStateClipboard: Partial<ExpenseFilter>

  private defaultFilter: ExpenseFilter = {
    date: {
      month: this.getCurrentMonthFilter().substring(5),
      year: this.getCurrentMonthFilter().substring(0, 4)
    }
  }

  constructor() {
    this.filterShown$ = new BehaviorSubject(false);

    let initialFilter: ExpenseFilter = JSON.parse(localStorage.getItem("filter")) || this.defaultFilter;
    initialFilter.groups = (initialFilter as any)?.groups?.map(groupId => parseInt(groupId)); // parse id's to number from string as read from localstorage
    this.filterState$ = new BehaviorSubject(initialFilter);
    this.monthSwitched$ = new BehaviorSubject(null);
    this.sortMethod$ = new BehaviorSubject(localStorage.getItem("sortMethod") || "date")
  }

  //resets a filter to its state before the temporary filter change
  resetFilter() {
    if (this.temporaryFilterStateClipboard) {
      this.setFilter(this.temporaryFilterStateClipboard);
      this.temporaryFilterStateClipboard = null;
    }
  }

  setFilter(newFilter: Partial<ExpenseFilter>) {
    //When choosing a cloes group a temporary filter is applied since the group isnt selectable in filter panel by default when closed. This lets you still see the groups details listing.
    //This temporary filter has to be reset to its former state by pressing "x" on the UI since the expense-list should just eb a temporary overlay.
    // pressing "x" will bring the expense list to its default state as it was before
    if (newFilter.temporaryFilter && !this.temporaryFilterStateClipboard) {
      this.temporaryFilterStateClipboard = this.filterState$.value;
    }
    this.filterState$.next(newFilter);
    this.monthSwitched$.next(null);
    localStorage.setItem("filter", JSON.stringify(newFilter))
  }

  setSortMethod(method: string) {
    localStorage.setItem("sortMethod", method);
    this.sortMethod$.next(method);
  }

  getFilter(): BehaviorSubject<ExpenseFilter> {
    return this.filterState$;
  }

  show() {
    this.resetFilter();
    this.filterShown$.next(true);
  }

  hide() {
    this.filterShown$.next(false);
  }


  /**
   * Either increments or decrements the month shown
   * @param method Either "increment" or "decrement"
   */
  public switchMonth(method: string) { // why the fuck wouldnt you do uniontype here ^^ - this entire project is dead in terms of code -  so sad , thought this was gonna be THE project where I wouldn't make stupid code decisions
    if (this.filterState$.value.date) {
      let current: MonthYear = this.monthSwitched$.value || this.filterState$.value.date;

      let incrementedDate: Date;
      if (method === "increment") {
        incrementedDate = addMonths(new Date(`${current.year}-${current.month}`), 1);
      } else {
        incrementedDate = subMonths(new Date(`${current.year}-${current.month}`), 1);
      }

      let incremented = { month: this.parseMonth(incrementedDate.getMonth() + 1), year: incrementedDate.getFullYear().toString() };
      this.monthSwitched$.next(incremented)
    }
  }


  /**
   * comparator function to sort by date descending (latest first)
   */
  public dateSorter = (a_date: string, b_date: string) => {
    if (!a_date || !b_date) {
      return;
    }
    return this.createComparatorNumber(b_date) - this.createComparatorNumber(a_date);
  }

  public amountSorter = (a: Expense, b: Expense) => {
    return b.amount - a.amount;
  }


  /**
  * Transforms "2020-02-15" to 20200215, for quick sorting after date
  */
  private createComparatorNumber(date: string) {
    return parseInt(date.split('-').join(''))
  }

  public getCurrentMonthFilter(): string {
    return '' + new Date().getFullYear() + '-' + this.parseMonth(new Date().getMonth() + 1)
  }

  public getMonthDateString(date: Date) {
    return `${date.getFullYear()}-${this.parseMonth(date.getMonth() + 1)}`
  }

  public parseMonth(month: number): string {
    if (month > 9) {
      return month.toString();
    } else {
      return `0${month}`;
    }
  }
}
