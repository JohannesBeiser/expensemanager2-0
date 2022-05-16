import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Category, CategoryService } from 'src/app/services/category/category.service';
import { Group, GroupsService } from 'src/app/services/groups/groups.service';
import { map, shareReplay} from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-custom-analysis',
  templateUrl: './custom-analysis.component.html',
  styleUrls: ['./custom-analysis.component.less']
})
export class CustomAnalysisComponent implements OnInit {

  constructor(
    private groupsService: GroupsService,
    private categoryService: CategoryService,
  ) { }

  public groupsWithSubgroups$: Observable<Group[]>;
  public groupsWithSubgroups: Group[];

  public categories$: Observable<Category[]>;
  public categories: Category[];

  selectedGroup: string = "999";
  selectedGroup$: Subject<string> = new Subject();

  selectedCategory: string = "999";
  selectedCategory$: Subject<string> = new Subject();

  ngOnInit(): void {
    this.groupsWithSubgroups$ = this.groupsService.getGroups().pipe(
      map(groups=>{
        return groups.reduce((acc,cur)=>{
          acc.push(cur);
          cur.subgroups.forEach(subgroup=>acc.push(subgroup));
          return acc;
        },[{name: "ALLE", id: 999}, {name: "General", id:0}] as Group[])
      }),
      shareReplay()
    );

    this.categories$ = this.categoryService.getCategoriesNew().pipe(
      map(categories=>{
        categories.push({name: "ALLE", id: 999} as Category);
        return categories;
      })
    );

    this.groupsWithSubgroups$.subscribe(el=>{
      this.groupsWithSubgroups = el;
    });

    this.categories$.subscribe(el=>{
      this.categories = el;
    });
  }


  groupChanged(){
    this.selectedGroup$.next(this.selectedGroup);
  }

  categoryChanged(){
    this.selectedGroup$.next(this.selectedCategory);
  }

}
