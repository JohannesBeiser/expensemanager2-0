import { Injectable } from '@angular/core';
import { Subject, Observable, ReplaySubject, BehaviorSubject } from 'rxjs';
import { IndexedDBConnectionService } from '../indexed-dbconnection.service';
import { addMonths, differenceInMonths, getMonth } from 'date-fns';
import { filter, take } from 'rxjs/operators';
import { HardcodedTags } from '../tag/tag.service';
import { HardcodedCategories } from '../category/category.service';

export interface Expense {
  name: string;
  amount: number;
  amount_foreign?: number;
  category: number;
  group: number; // id of the group
  tags: number[];
  date: string;
  description?: string;
  currency?: string;
  recurring?: boolean;
  lastUpdate?: string;
  key?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  private db: any;
  private expenses$: BehaviorSubject<Expense[]>;
  private recurringExpenses$: BehaviorSubject<Expense[]>;
  private connection$: ReplaySubject<boolean>;
  public expenseDeletedNotifier: Subject<void>;

  constructor(
    private indexedDBService: IndexedDBConnectionService,
  ) {
    this.connection$ = new ReplaySubject(1);
    this.createExpenseDatabase();
    this.expenses$ = new BehaviorSubject<Expense[]>([]);
    this.recurringExpenses$ = new BehaviorSubject<Expense[]>([]);
    this.expenseDeletedNotifier = new Subject();
    this.checkRecurringExpenses();
  }


  getFormatDate(date: Date): string {
    return `${date.getFullYear()}-${this.getPrettyMonth(date.getMonth() + 1)}-01`
  }

  getPrettyMonth(number: number): string {
    if (number < 10) {
      return 0 + number.toString();
    } else {
      return number.toString();
    }
  }

  checkRecurringExpenses() {
    this.getExpenses("recurringExpenses").pipe(
      filter(el=>el.length>0),
      take(1)
    ).subscribe(expenses => {
      expenses.forEach(expense => {
        if ((!expense.lastUpdate || addMonths(new Date(expense.lastUpdate), 1) < new Date()) && new Date() > new Date(expense.date)) {
          // update needed for this expense
          let key = expense.key;
          delete expense.lastUpdate;
          delete expense.key;
          this.addExpense({ ...expense, ...{ date: this.getFormatDate(new Date(new Date().getFullYear(), new Date().getMonth())) } }, "expenses");
          this.updateExpense(key, { ...expense, ...{ lastUpdate: this.getFormatDate(new Date()) } }, "recurringExpenses")
        }
      });
    });
  }

  /**
   *
   * @param expense
   * @param type either 'expenses' or 'recurringExpenses'
   */
  public addExpense(expense: Expense, type: "expenses" | "recurringExpenses", fromBackup?: boolean) {
    let tx = this.db.transaction([type], 'readwrite');
    let store = tx.objectStore(type);
    store.add(expense);
    if (type == "recurringExpenses" && !fromBackup) {
      this.addInitialRecurrentEntries(expense)
    }

    tx.oncomplete = (val,val2,val3,val4) => {
      if (type == "recurringExpenses") {
        this.refreshExpenses(type);
      } else {
        this.refreshExpenses(type);
      }
    }
    tx.onerror = (event) => {
      alert('error storing expense ' + event.target.errorCode);
    }
  };

  addInitialRecurrentEntries(expense: Expense) {
    let currentMonthDate = new Date(new Date().getFullYear(), new Date().getMonth());
    let counter = 0;
    // becomes -1 once iterating date after expense date
    while (differenceInMonths(currentMonthDate, addMonths(new Date(expense.date), counter)) >= 0) {
      let pastRecurrentExpense = { ...expense, ...{ date: this.getFormatDate(addMonths(new Date(expense.date), counter)) } }
      delete pastRecurrentExpense.lastUpdate;
      this.addExpense(pastRecurrentExpense, "expenses")
      counter++;
    }
  }

  /**
   * Gets all of the expenses from the IndexedDB
   * @param type either "expenses" or "recurring"
   */
  public getExpenses(type: string = "expenses"): Observable<Expense[]> {
    this.connection$.subscribe(() => this.refreshExpenses(type));
    if (type == "expenses") {
      return this.expenses$.asObservable();
    } else {
      return this.recurringExpenses$.asObservable();
    }
  }


  /**
   * similar to nameChanged function but returns a modiefied expense from autofilling tags/category from the name
   */
   getAutofilledExpense(expense: Expense): Expense{

    let expenseName = expense.name;

    { // Food
      let groceryTrigger=["Rewe", "Lidl", "Walmart", "Kaufland", "Grocery", "Groceri", "Lebensmittel", "Wocheneinkauf", "Netto", "Spar", "Aldi", "Edeka", "Bäcker"].map(el=>el.toLowerCase());
      let eatOutTrigger = ["Döner", "Restaurant", "Pizza", "Sushi", "essen gehen", "Burger", "Pommes", "fries", "mc donalds", "kfc", "subway", "Buffet"].map(el=>el.toLowerCase());
      //Add Tag Groceries
      if(groceryTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        // add grocery tag
        if(!expense.tags.includes(HardcodedTags.Groceries)){
          expense.tags.push(HardcodedTags.Groceries);
        }
        expense.category = HardcodedCategories.Food
      }

      //Add Tag Eat-Out
      if(eatOutTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        // add Eat-Out tag
        if(!expense.tags.includes(HardcodedTags.EatOut)){
          expense.tags.push(HardcodedTags.EatOut);
        }
        expense.category=HardcodedCategories.Food
      }

      //Resupply
      if(expenseName.includes("resupply")){
        if(!expense.tags.includes(HardcodedTags.Groceries)){
          expense.tags.push(HardcodedTags.Groceries);
        }
        if(!expense.tags.includes(HardcodedTags.Resupply)){
          expense.tags.push(HardcodedTags.Resupply);
        }
        expense.category=HardcodedCategories.Food    }
      }

    { // Accommodation
      let hotelTrigger = ["Hotel", "Motel", "Lodge"].map(el=>el.toLowerCase());
      let hostelTrigger = ["Hostel"].map(el=>el.toLowerCase());
      let campingTrigger = ["Camping", "zelten", "tenting"].map(el=>el.toLowerCase());
      let rentTrigger = ["Miete", "rent"].map(el=>el.toLowerCase());

      if(hotelTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.HotelAirBnB)){
          expense.tags.push(HardcodedTags.HotelAirBnB);
        }
        expense.category=HardcodedCategories.Accommodation
      }
      if(hostelTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Hostel)){
          expense.tags.push(HardcodedTags.Hostel);
        }
        expense.category=HardcodedCategories.Accommodation
      }
      if(campingTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Camping)){
          expense.tags.push(HardcodedTags.Camping);
        }
        expense.category=HardcodedCategories.Accommodation
      }
      if(rentTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Rent)){
          expense.tags.push(HardcodedTags.Rent);
        }
        expense.category=HardcodedCategories.Accommodation
      }
    }

    { // Transport
      let taxiTrigger = ["taxi", "uber", "bla bla", "blabla"].map(el=>el.toLowerCase());
      let boatTrigger = ["schiff", "boat", "fähre", "ferry", "boot"].map(el=>el.toLowerCase());
      let flightTrigger = ["Flight", "flug", "flugzeug", "airplane"].map(el=>el.toLowerCase());
      let busTrigger = ["bus"].map(el=>el.toLowerCase());
      let trainTrigger = ["zug", "train"].map(el=>el.toLowerCase());

      if(taxiTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Taxi)){
          expense.tags.push(HardcodedTags.Taxi);
        }
        expense.category=HardcodedCategories.Transport
      }
      if(boatTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Boat)){
          expense.tags.push(HardcodedTags.Boat);
        }
        expense.category=HardcodedCategories.Transport
      }
      if(flightTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Flight)){
          expense.tags.push(HardcodedTags.Flight);
        }
        expense.category=HardcodedCategories.Transport
      }
      if(busTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Bus)){
          expense.tags.push(HardcodedTags.Bus);
        }
        expense.category=HardcodedCategories.Transport
      }
      if(trainTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Train)){
          expense.tags.push(HardcodedTags.Train);
        }
        expense.category=HardcodedCategories.Transport
      }
    }

    { // Other
      let haircutTrigger = ["barber", "haircut", "hairdresser", "friseur", "haarschnitt"].map(el=>el.toLowerCase());
      let shipmentTrigger = ["post", "usps", "dhl", "fedex", "ups", "paket", "versand","package"].map(el=>el.toLowerCase());
      let giftTrigger = ["gift", "geschenk", "donation", "spende"].map(el=>el.toLowerCase());


      if(haircutTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Hairdresser)){
          expense.tags.push(HardcodedTags.Hairdresser);
        }
        expense.category=HardcodedCategories.General
      }

      if(shipmentTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Shipment)){
          expense.tags.push(HardcodedTags.Shipment);
        }
        expense.category=HardcodedCategories.General
      }

      if(giftTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!expense.tags.includes(HardcodedTags.Gift)){
          expense.tags.push(HardcodedTags.Gift);
        }
        expense.category=HardcodedCategories.General
      }

  }
  return expense;
}


  /**
   * Gets all of the expenses from the IndexedDB
   * @param type either "expenses" or "recurring"
   */
  public getExpensesWithoutUpdate(type: string= "expenses"): Observable<Expense[]> {
    if (type == "expenses") {
      return this.expenses$.asObservable();
    } else {
      return this.recurringExpenses$.asObservable();
    }
  }

  public updateExpense(key: number, value: Expense, type: string) {
    let transaction = this.db.transaction(type, "readwrite");
    let objectStore = transaction.objectStore(type);
    let req = objectStore.put(value, key);
    req.onsuccess = () => {
      this.refreshExpenses(type);
    }
  }

  public deleteExpense(key: number, type: string) {
    let transaction = this.db.transaction(type, "readwrite");
    let objectStore = transaction.objectStore(type);
    let req = objectStore.delete(key);
    this.expenseDeletedNotifier.next();
    req.onsuccess = () => {
      this.refreshExpenses(type);
    }
  }

  clearData(type: string) {
    let transaction = this.db.transaction(type, "readwrite");
    var objectStore = transaction.objectStore(type);
    objectStore.clear();
  }

  /**
   * Makes the Observable emit all of the new values from the DB
   */
  private refreshExpenses(type: string) {
    let transaction = this.db.transaction([type]);
    let object_store = transaction.objectStore(type);
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
        if (type == "expenses") {
          this.expenses$.next(result);
        } else {
          this.recurringExpenses$.next(result);
        }
      }
    };
  }

  private createExpenseDatabase() {
    let dbReq = this.indexedDBService.getConnection()

    dbReq.onupgradeneeded = (event) => {
      let db = (event.target as any).result;
      this.indexedDBService.upgradeDatabase(db);
      //For dev purposes only
      // setTimeout(() => {
      //   this.seedExpenses();
      //   for (const group of groups) {
      //     this.addGroup(group);
      //   }
      // }, 1000);
    }

    dbReq.onsuccess = (event) => {
      this.db = (event.target as any).result;
      this.connection$.next(true);
    }

    dbReq.onerror = function (event) {
      alert('error opening database ' + (event.target as any).errorCode);
    }
  }

  getMonthByIndex(i: number){
    let months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    return months[i];
  }

}
