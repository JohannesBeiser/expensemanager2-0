import { Injectable } from '@angular/core';
import { IndexedDBConnectionService } from '../indexed-dbconnection.service';
import { ReplaySubject, BehaviorSubject, Observable } from 'rxjs';

export type Income = {
  group: string;
  amount_net: number;
  amount_gross: number;
  date: number; // iso milliseconds number
  comment?: string;
  id?: number;
  key?: any; // should probably be number
}


@Injectable({
  providedIn: 'root'
})
export class IncomeService {

  private db: any;
  private connection$: ReplaySubject<boolean>;
  private incomeEntries$: BehaviorSubject<Income[]>;
  private incomeEntries: Income[];

  constructor( private indexedDBService: IndexedDBConnectionService) {
    this.connection$ = new ReplaySubject(1);
    this.createIncomeDatabase();
    this.incomeEntries$ = new BehaviorSubject<Income[]>([]);
    this.incomeEntries$.subscribe(income=>{
      this.incomeEntries = income;
    })
    this.connection$.subscribe(()=>this.refreshIncome());
  }


  getIncomeFromId(id: number): Income{
    return this.incomeEntries.find(el=> el.id == id);
  }

  public addIncomeFromBackup(income: Income){
    let tx = this.db.transaction(['earnings'], 'readwrite');
    let store = tx.objectStore('earnings');
    store.add(income);
    tx.oncomplete = () => {
      this.refreshIncome();
    }
    tx.onerror = (event) => {
      alert('error storing expense ' + event.target.errorCode);
    }
  }

  public addIncome(income: Income){
    //alter color to make it HEX
    income.id = Date.now(); // Quick way to generate a unique ID. Not possible to mess anything up ina  use-case like this with 1 user only and local data
    let tx = this.db.transaction(['earnings'], 'readwrite');
    let store = tx.objectStore('earnings');
    store.add(income);
    tx.oncomplete = () => {
      this.refreshIncome();
    }
    tx.onerror = (event) => {
      alert('error storing income ' + event.target.errorCode);
    }
  };

  public editIncome(income: Income, key: number){
    let transaction = this.db.transaction('earnings', "readwrite");
    let objectStore = transaction.objectStore('earnings');
    let req = objectStore.put(income, key);
    req.onsuccess = () => {
      this.refreshIncome();
    }

  }

  public getIncome(): Observable<Income[]> {
    return this.incomeEntries$.asObservable();
  }

  clearData(){
    let transaction = this.db.transaction("earnings", "readwrite");
    let objectStore = transaction.objectStore("earnings");
    objectStore.clear();
  }


  public deleteIncome(key: number) {
    let transaction = this.db.transaction("earnings", "readwrite");
    let objectStore = transaction.objectStore("earnings");
    let req = objectStore.delete(key);
    req.onsuccess = () => {
      this.refreshIncome();
    }
    //TODO: default ablegen per key nicht name und dann hier nach key anfrage
    // if(this.defaultCategory == categoryName){
    //   this.setDefaultCategory("General");
    // }
  }


  /**
   * Makes the Observable emit all of the new values from the DB
   */
  private refreshIncome() {
    let transaction = this.db.transaction(["earnings"]);
    let object_store = transaction.objectStore("earnings");
    let request = object_store.openCursor();
    let result: Income[] = []
    request.onsuccess = (event) => {
      let cursor = event.target.result;
      if (cursor) {
        let key = cursor.primaryKey;
        let value = cursor.value;
        result.push({ ...{ key }, ...value })
        cursor.continue();
      }else{
        this.incomeEntries$.next(result);
      }
    };
  }

  private createIncomeDatabase() {
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
}
