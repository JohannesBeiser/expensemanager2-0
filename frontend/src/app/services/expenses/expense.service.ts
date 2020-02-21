import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';

export interface Expense {
  name: string;
  amount: number;
  category: string;
  date: Date;
  description?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  private db: any;
  private expenses$: Subject<Expense[]>;
  private connection$: ReplaySubject<boolean>;

  constructor() {
    this.connection$ = new ReplaySubject(1);
    this.createExpenseDatabase();
    this.expenses$ = new Subject<Expense[]>();
  }

  public addExpense(expense: Expense) {
    let tx = this.db.transaction(['expenses'], 'readwrite');
    let store = tx.objectStore('expenses');
    // Put the sticky note into the object store
    store.add(expense);
    // Wait for the database transaction to complete
    tx.oncomplete = () => {
      this.refreshExpenses();
    }
    tx.onerror = (event) => {
      alert('error storing expense ' + event.target.errorCode);
    }
  };

  public getExpenses(): Observable<Expense[]> {
    this.connection$.subscribe(()=>this.refreshExpenses());
    return this.expenses$.asObservable();
  }

  public updateExpense(key: number, value: Expense) {
    var transaction = this.db.transaction("expenses", "readwrite");
    var objectStore = transaction.objectStore("expenses");
    let req = objectStore.put(value, key);
    req.onsuccess = () => {
      this.refreshExpenses();
    }
  }

  public deleteExpense(key: number) {
    var transaction = this.db.transaction("expenses", "readwrite");
    var objectStore = transaction.objectStore("expenses");
    let req = objectStore.delete(key);
    req.onsuccess = () => {
      this.refreshExpenses();
    }
  }

  /**
   * Makes the Observable emit all of the new values from the DB
   */
  private refreshExpenses() {
    console.log("refreshed");
    let transaction = this.db.transaction(["expenses"]);
    let object_store = transaction.objectStore("expenses");
    let request = object_store.openCursor();
    let result: Expense[] = []

    request.onsuccess = (event) => {
      let cursor = event.target.result;
      if (cursor) {
        let key = cursor.primaryKey;
        let value = cursor.value;
        result.push({ ...{ key }, ...value })
        cursor.continue();
      }
      else {
        this.expenses$.next(result)
      }
    };
  }

  private createExpenseDatabase() {
    let dbReq = indexedDB.open('ExpenseManagerDB', 1);

    dbReq.onupgradeneeded = (event) => {
      this.db = (event.target as any).result;
      this.db.createObjectStore('expenses', { autoIncrement: true });
    }

    dbReq.onsuccess = (event) => {
      this.db = (event.target as any).result;
      this.connection$.next(true);
    }

    dbReq.onerror = function (event) {
      alert('error opening database ' + (event.target as any).errorCode);
    }
  }
}
