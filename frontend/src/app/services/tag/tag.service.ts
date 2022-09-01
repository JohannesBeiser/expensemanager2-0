import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { IndexedDBConnectionService } from '../indexed-dbconnection.service';


export interface Tag {
  name: string,
  id: number,
  key?: number,
}

export const HardcodedTags={
  Travel: 1638199877164,
  NonTravel: 1638199880620,
  ThruHike: 1639339181507,
  Groceries: 1639339147966,
  EatOut: 1639339152378,
  Rent: 1639339338552,
  Flight: 1639339455828,
  Hairdresser: 1639339610335,
  HotelAirBnB: 1639339933396,
  Hostel: 1639340193701,
  Camping: 1639340197500,
  Resupply: 1639843667689,
  Shipment: 1640136505672,
  Car: 1639874253792,
  Train: 1640702671588,
  Bus: 1640702675776,
  Boat: 1653081031035,
  Gift: 1639339570936,
  Taxi: 1640702695771
}


@Injectable({
  providedIn: 'root'
})
export class TagService {


  private db: any;
  private tags$: BehaviorSubject<Tag[]>;
  private tags: Tag[];
  private connection$: ReplaySubject<boolean>;

  constructor(
    private indexedDBService: IndexedDBConnectionService
  ) {
    this.connection$ = new ReplaySubject(1);
    this.createTagDatabase();
    this.tags$ = new BehaviorSubject<Tag[]>([]);
    this.tags$.subscribe(tags=>{
      this.tags= tags;
    })
  }

  getTagById(id: number): Tag{
    return this.tags.find(el=> el.id == id);
  }

  convertIdsToTags(ids: number[]): Tag[]{
    let result =  ids.map(id=>this.getTagById(id))
    return result;
  }

  public addTag(tag: Tag) {
    let tx = this.db.transaction(['tags'], 'readwrite');
    let store = tx.objectStore('tags');
    tag.id = Date.now();
    store.add(tag);
    tx.oncomplete = () => {
      this.refreshTags();
    }
    tx.onerror = (event) => {
      alert('error storing tag ' + event.target.errorCode);
    }
  };

  public addTagFromBackup(tag: Tag){
    let tx = this.db.transaction(['tags'], 'readwrite');
    let store = tx.objectStore('tags');
    store.add(tag);
    tx.oncomplete = () => {
      this.refreshTags();
    }
    tx.onerror = (event) => {
      alert('error storing tag ' + event.target.errorCode);
    }
  }

  public updateTag(key: number, tag: Tag){
      let transaction = this.db.transaction('tags', "readwrite");
      let objectStore = transaction.objectStore('tags');
      let req = objectStore.put(tag, key);
      req.onsuccess = () => {
        this.refreshTags();
      }

  }

  public getTags(): Observable<Tag[]> {
    this.connection$.subscribe(()=>this.refreshTags());
    return this.tags$.asObservable();
  }

  // optimized for overlays which don't own a route to not request double amount
  public getTagsWithoutUpdate(){
    return this.tags$.asObservable();
  }

  clearData(){
    let transaction = this.db.transaction("tags", "readwrite");
    let objectStore = transaction.objectStore("tags");
    objectStore.clear();
  }


  public deleteTag(key: number, tag: Tag) {
    let transaction = this.db.transaction("tags", "readwrite");
    let objectStore = transaction.objectStore("tags");
    let req = objectStore.delete(key);
    req.onsuccess = () => {
      this.refreshTags();
    }
  }




  /**
   * Makes the Observable emit all of the new values from the DB
   */
  private refreshTags() {
    let transaction = this.db.transaction(["tags"]);
    let object_store = transaction.objectStore("tags");
    let request = object_store.openCursor();
    let result: Tag[] = []

    request.onsuccess = (event) => {
      let cursor = event.target.result;
      if (cursor) {
        let key = cursor.primaryKey;
        let value = cursor.value;
        result.push({ ...{ key }, ...value })
        cursor.continue();
      }
      else {
        this.tags$.next(result)
      }
    };
  }

  private createTagDatabase() {
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
