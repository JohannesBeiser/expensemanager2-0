import { Injectable } from '@angular/core';
import { differenceInDays } from 'date-fns';
import { ReplaySubject, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Expense } from '../expenses/expense.service';
import { FilterService } from '../filter/filter.service';
import { IndexedDBConnectionService } from '../indexed-dbconnection.service';

export interface Group {
  key?: number;
  name: string;
  id?: number;
  subgroups?: Subgroup[];
  active?: boolean;
}

export interface GroupTotalHelper {
  key?: number;
  name: string;
  id?: number;
  subgroups?: SubgroupTotal[];
  active?: boolean;
}


export interface Subgroup {
  id?: number;
  name: string;
  subgroups?: Subgroup[];
}

export interface SubgroupTotal {
  id?: number;
  name: string;
  subgroups?: SubgroupTotal[];
  amount: number;
  firstExpenseDate?: string;
  lastExpenseDate?: string;
  durationInDays?: number;
}

export interface GroupTotal extends GroupTotalHelper {
  amount: number;
  firstExpenseDate?: string;
  lastExpenseDate?: string;
  durationInDays?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GroupsService {

  private db: any;
  private groups$: BehaviorSubject<Group[]>;
  private groups: Group[];
  private connection$: ReplaySubject<boolean>;
  public defaultGroup: number; // id of the group

  constructor(
    private indexedDBService: IndexedDBConnectionService,
    private filterService: FilterService
  ) {
    this.connection$ = new ReplaySubject(1);
    this.createGroupDatabase();
    this.groups$ = new BehaviorSubject<Group[]>([]);
    this.groups$.subscribe(groups => {
      this.groups = groups;
    })
    this.defaultGroup = parseInt(localStorage.getItem("defaultGroup") || "General");
  }

  getGroupById(id: number): Group {
    if (id === 0) {
      return { name: "General", id: 0 }
    }

    let match = this.groups.find(el => el.id == id);
    // If ID doesnt belong to a group --> must belong to subgroup
    if (!match) {
      this.groups.forEach(group => {
        let nestedSubgroups = this.getSubgroupsRecursive(group);

        nestedSubgroups.forEach(subgroup => {
          if (id == subgroup.id) {
            match = subgroup;
          }
        })
      })
    }
    return match;
  }

  getAllGroupsIncludingSubgroups(): Observable<Group[]> {
    return this.getGroupsWithoutUpdate().pipe(
      map(groups => {
        return groups.reduce((acc, cur) => {
          acc.push(cur);
          acc.push(...this.getSubgroupsRecursive(cur))
          return acc;
        }, [])
      })
    )
  }

  /**
   * Returns all of a grouips subgroups including all nested subgroups
   * @param group The highest top level actual group that you want all its soubgroups of
   * @returns
   */
  getSubgroupsRecursive(group: Group | Subgroup): Subgroup[] {
    return group.subgroups?.reduce((acc, cur) => {
      acc.push(...this._getSubgroupsRecursive(cur));
      return acc;
    }, []) || [];
  }

  _getSubgroupsRecursive(subgroup: Subgroup, collected: Subgroup[] = []): Subgroup[] {
    let result = [...collected, subgroup];
    if (subgroup.subgroups?.length == 0) return result;
    return subgroup.subgroups?.reduce((acc, cur) => {
      if (cur.subgroups?.length > 0) {
        acc.push(...this._getSubgroupsRecursive(cur, result))
      } else {
        acc.push(...result, cur)
      }
      return acc;
    }, []) || result;

  }

  calculateGroupsTotals(expenses: Expense[], groups_origin: Group[]): GroupTotal[] {
    /**   at first all expenses are just added nested into the deepest matcgh, jnot accumulkating the amount for the parent,
     * so "north america" diesnt get the "GDT" amounts yet, so that we dont have to find each childs parent recursively to the top every time we add someting
     *
     * After all is done we can recursively add the totals to all parents bubelling upwards
     */
    expenses.forEach(expense => {
      let expenseGroup = expense.group;
      if (expenseGroup !== 0) {
        let match: { amount: number, firstExpenseDate: string, lastExpenseDate: string, durationInDays?: number, name: string, id: number, subgroups?: Subgroup[] } = this.getGroupMatchRecursively(groups_origin, expenseGroup) as any;

        if (!match) {
          alert("Gruppe von expense konnte nicht zugeordnet werden")
        }

        if (!match.amount) {
          match.amount = expense.amount;
        } else {
          match.amount += expense.amount;
        }

        if (!match.firstExpenseDate) {
          match.firstExpenseDate = expense.date;
        } else {
          if (new Date(match.firstExpenseDate) > new Date(expense.date)) {
            match.firstExpenseDate = expense.date
          }
        }

        if (!match.lastExpenseDate) {
          match.lastExpenseDate = expense.date;
        } else {
          if (new Date(match.lastExpenseDate) < new Date(expense.date)) {
            match.lastExpenseDate = expense.date
          }
        }
      }
    });


    let totals: GroupTotal[] = groups_origin.map(el => {
      (el as any).durationInDays = differenceInDays(new Date((el as any).lastExpenseDate), new Date((el as any).firstExpenseDate)) + 1;
      if (el.subgroups?.length > 0) {
        el.subgroups = this.addDurationRecursive(el.subgroups);
      }
      return el as any
    });

    (groups_origin as GroupTotal[]).forEach((group) => {
      this.mutateTotalFromSubgroups(group);
    });

    let sorted = totals.sort((a, b) => this.filterService.dateSorter(a.firstExpenseDate, b.firstExpenseDate))

    return sorted;
  }

  /**
 * searches in an array of groups for a specific group by ID including recursively deep search
 */
  getGroupMatchRecursively(groups: Group[], id: number): Group | Subgroup {
    let match = undefined;
    groups.forEach(group => {
      if (group.id == id) {
        match = group;
        return;
      };
      if (group.subgroups?.length > 0) {
        let subgroupMatch = this.getGroupMatchRecursively(group.subgroups, id);
        if (subgroupMatch) {
          match = subgroupMatch;
          return;
        }
      } else {
        return;
        // go to next (parent) group
      }
    });

    return match; // should never happen
  }


  /**
* Changes a groups total according to its child groups, takes nested subgroups into account thus calls itself recursively
*
* Does actually mutate all data inside, so the base object is gonna be formatted
*/
  mutateTotalFromSubgroups(group: GroupTotal) {
    if (group.subgroups?.length > 0) {
      let total: number = group.subgroups.reduce((acc, cur) => {
        if (cur.subgroups?.length == 0) {
          acc += cur.amount; // TODO: maybe also alter date/duration of parent? ! should actually do that : FIXME
        } else {
          // has nested subgroup --> mutate their total
          this.mutateTotalFromSubgroups(cur); // before adding up the current subgroups amount we need to mutat its own total since it has subgroups itself
          acc += cur.amount;
        }
        return acc;
      }, 0);
      group.amount += total;
    } else {
      return group.amount; // no mutation needed, already correct
    }
  }


  addDurationRecursive(groups: Group[]): Group[] {
    return groups.map(el => {
      (el as any).durationInDays = differenceInDays(new Date((el as any).lastExpenseDate), new Date((el as any).firstExpenseDate));
      if (el.subgroups?.length > 0) {
        el.subgroups = this.addDurationRecursive(el.subgroups)
      }
      return el;
    })
  }

  public addGroup(group: Group) {
    let tx = this.db.transaction(['groups'], 'readwrite');
    let store = tx.objectStore('groups');
    store.add(group);
    tx.oncomplete = () => {
      this.refreshGroups();
    }
    tx.onerror = (event) => {
      alert('error storing expense ' + event.target.errorCode);
    }
  };

  public updateGroup(key: number, group: Group) {
    let transaction = this.db.transaction('groups', "readwrite");
    let objectStore = transaction.objectStore('groups');
    let req = objectStore.put(group, key);
    req.onsuccess = () => {
      this.refreshGroups();
    }

  }

  public getGroups(): Observable<Group[]> {
    this.connection$.subscribe(() => this.refreshGroups());
    return this.groups$.asObservable();
  }

  // optimized for overlays which don't own a route to not request double amount
  public getGroupsWithoutUpdate() {
    return this.groups$.asObservable();
  }

  clearData() {
    let transaction = this.db.transaction("groups", "readwrite");
    let objectStore = transaction.objectStore("groups");
    objectStore.clear();
  }


  public deleteGroup(key: number, group: Group) {
    let transaction = this.db.transaction("groups", "readwrite");
    let objectStore = transaction.objectStore("groups");
    let req = objectStore.delete(key);
    req.onsuccess = () => {
      this.refreshGroups();
    }
    if (this.defaultGroup == group.id) {
      this.setDefaultGroup(0); // 0 being general group
    }
  }


  public setDefaultGroup(id: number) {
    localStorage.setItem("defaultGroup", id.toString())
    this.defaultGroup = id;
  }

  /**
   * Makes the Observable emit all of the new values from the DB
   */
  private refreshGroups() {
    let transaction = this.db.transaction(["groups"]);
    let object_store = transaction.objectStore("groups");
    let request = object_store.openCursor();
    let result: Group[] = []

    request.onsuccess = (event) => {
      let cursor = event.target.result;
      if (cursor) {
        let key = cursor.primaryKey;
        let value = cursor.value;
        result.push({ ...{ key }, ...value })
        cursor.continue();
      }
      else {
        this.groups$.next(result)
      }
    };
  }

  private createGroupDatabase() {
    let dbReq = this.indexedDBService.getConnection();

    dbReq.onupgradeneeded = (event) => {
      let db = (event.target as any).result;
      this.indexedDBService.upgradeDatabase(db);
    }

    dbReq.onsuccess = (event) => {
      this.db = (event.target as any).result;
      this.connection$.next(true);
    }

    dbReq.onerror = function (event) {
      alert('error opening database ' + (event.target as any).errorCode);
    }
  }

  // public seedGroups(){
  //   for (const group of groups) {
  //     this.addGroup(group);
  //   }
  // }

}
