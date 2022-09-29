import { Injectable } from '@angular/core';
import { Tag } from './tag/tag.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBConnectionService {

  constructor() { }

  upgradeDatabase(db: any){
    const stores = db.objectStoreNames;

    if (!stores.contains("expenses")) {
      db.createObjectStore('expenses', { autoIncrement: true });
      console.log("Added IndexedDB store 'expenses'")
    }

    if (!stores.contains("recurringExpenses")) {
      db.createObjectStore('recurringExpenses', { autoIncrement: true });
      console.log("Added IndexedDB store 'expenses'")
    }

    if (!stores.contains("groups")) {
      db.createObjectStore('groups', { autoIncrement: true });
      console.log("Added IndexedDB store 'groups'")
    }
    if (!stores.contains("categories")) {
      db.createObjectStore('categories', { autoIncrement: true });
      console.log("Added IndexedDB store 'categories'")
    }
    if (!stores.contains("tags")) {
      db.createObjectStore('tags', { autoIncrement: true });

      //init with defaults
      let defaultTags:Tag[] =[
        {name: 'Travel' , id: 1638199877164},
        {name: 'Non-Travel', id: 1638199880620}
      ]
      let dbReq  = this.getConnection()
      dbReq.onsuccess = (event) => {
        let db = (event.target as any).result;
        let tx = db.transaction(['tags'], 'readwrite');
        let store = tx.objectStore('tags');
        defaultTags.forEach(tag=> store.add(tag))
        tx.onerror = (event) => {
          alert('error storing default tags ' + event.target.errorCode);
        }
      }


      console.log("Added IndexedDB store 'tags'")
    }

    if (!stores.contains("earnings")) {
      db.createObjectStore('earnings', { autoIncrement: true });
      console.log("Added IndexedDB store 'earnings'")
    }
  }



  /**
   * DB Versions:
   * 1: expense
   * 2: +groups
   * 3: +recurringExpenses
   * 4: + categories
   * 5: + tags
   * 6: + earnings
   */
  getConnection(): IDBOpenDBRequest{
    return indexedDB.open('ExpenseManagerDB', 6)
  }
}
