import { Injectable } from '@angular/core';
import { IndexedDBConnectionService } from '../indexed-dbconnection.service';
import { ReplaySubject, BehaviorSubject, Observable } from 'rxjs';

export interface CategoryColor{
  food: string;
  transport: string;
  accommodation: string;
  multimedia: string;
  leisure: string;
  gear: string;
  health_insurance: string;
  general: string;
}

export interface Category{
  name: string;
  color: string;
  id: number;
  key?: number;
}

export const HardcodedCategories = {
  Food: 1637006412319,
  Transport: 1637006412320,
  Accommodation: 1637006412321,
  Multimedia: 1637006412322,
  HealthInsurance: 1637006412324,
  General: 1637006412325,
  ClothingGear: 1637006412326,
  Invest: 1638217648875,
}


@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  public defaultCategory: number;
  private db: any;
  private connection$: ReplaySubject<boolean>;
  private categories$: BehaviorSubject<Category[]>;
  private categories: Category[];

  constructor( private indexedDBService: IndexedDBConnectionService) {
    this.connection$ = new ReplaySubject(1);
    this.createCategoryDatabase();
    this.categories$ = new BehaviorSubject<Category[]>([]);
    this.categories$.subscribe(categories=>{
      this.categories= categories;
    })
    this.defaultCategory = parseInt(localStorage.getItem("defaultCategory"));
    this.connection$.subscribe(()=>this.refreshCategories());
  }


  public setDefaultCategory(category:number){
    localStorage.setItem("defaultCategory", category.toString())
    this.defaultCategory = category;
  }

  getCategoryFromId(id: number): Category{
    return this.categories.find(el=> el.id == id) || {name: 'unassigned', color: 'deeppink', id: 0};
  }

  public addCategoryFromBackup(category: Category){
    let tx = this.db.transaction(['categories'], 'readwrite');
    let store = tx.objectStore('categories');
    store.add(category);
    tx.oncomplete = () => {
      this.refreshCategories();
    }
    tx.onerror = (event) => {
      alert('error storing expense ' + event.target.errorCode);
    }
  }

  public addCategory(category: Category){
    //alter color to make it HEX
    category.id = Date.now(); // Quick way to generate a unique ID. Not possible to mess anything up ina  use-case like this with 1 user only and local data
    let tx = this.db.transaction(['categories'], 'readwrite');
    let store = tx.objectStore('categories');
    store.add(category);
    tx.oncomplete = () => {
      this.refreshCategories();
    }
    tx.onerror = (event) => {
      alert('error storing expense ' + event.target.errorCode);
    }
  };

  public editCategory(category: Category, key: number){
    let transaction = this.db.transaction('categories', "readwrite");
    let objectStore = transaction.objectStore('categories');
    let req = objectStore.put(category, key);
    req.onsuccess = () => {
      this.refreshCategories();
    }

  }

  public getCategoriesNew(): Observable<Category[]> {
    return this.categories$.asObservable();
  }

  // optimized for overlays which don't own a route to not request double amount
  public getGroupsWithoutUpdate(){
    return this.categories$.asObservable();
  }

  clearData(){
    let transaction = this.db.transaction("categories", "readwrite");
    let objectStore = transaction.objectStore("categories");
    objectStore.clear();
  }


  public deleteCategory(key: number) {
    let transaction = this.db.transaction("categories", "readwrite");
    let objectStore = transaction.objectStore("categories");
    let req = objectStore.delete(key);
    req.onsuccess = () => {
      this.refreshCategories();
    }
    //TODO: default ablegen per key nicht name und dann hier nach key anfrage
    // if(this.defaultCategory == categoryName){
    //   this.setDefaultCategory("General");
    // }
  }


  /**
   * Makes the Observable emit all of the new values from the DB
   */
  private refreshCategories() {
    let transaction = this.db.transaction(["categories"]);
    let object_store = transaction.objectStore("categories");
    let request = object_store.openCursor();
    let result: Category[] = []

    request.onsuccess = (event) => {
      let cursor = event.target.result;
      if (cursor) {
        let key = cursor.primaryKey;
        let value = cursor.value;
        result.push({ ...{ key }, ...value })
        cursor.continue();
      }
      else {
        result.push({name: 'unassigned', color: 'deeppink', id: 0}); // add default category 'unassigned'
        this.categories$.next(result)
      }
    };
  }

  private createCategoryDatabase() {
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
