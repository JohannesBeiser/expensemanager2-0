import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { Category, CategoryService } from 'src/app/services/category/category.service';
import { Group, GroupsService } from 'src/app/services/groups/groups.service';
import { map, shareReplay, filter, startWith, take} from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Tag, TagService } from 'src/app/services/tag/tag.service';
import { FormControl } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { ExpenseService } from 'src/app/services/expenses/expense.service';

@Component({
  selector: 'app-custom-analysis',
  templateUrl: './custom-analysis.component.html',
  styleUrls: ['./custom-analysis.component.less']
})
export class CustomAnalysisComponent implements OnInit {

  constructor(
    private groupsService: GroupsService,
    private categoryService: CategoryService,
    public tagService: TagService,
    private expenseService: ExpenseService
  ) { }

  public groupsWithSubgroups$: Observable<Group[]>;
  public groupsWithSubgroups: Group[];

  public categories$: Observable<Category[]>;
  public categories: Category[];

  selectedGroup: string = "999";
  selectedGroup$: Subject<string> = new Subject();

  selectedCategory: string = "999";
  selectedCategory$: Subject<string> = new Subject();

  public selectedTagIds: number[] = [];
  tagFormControl: FormControl = new FormControl('');
  public filteredTags$: Observable<Tag[]>; // always changing --> source of dropdown options
  public allTags: Tag[];
  public tags$: Observable<Tag[]>;

  @ViewChild('tagSelectInputElement') tagSelectInputElement: ElementRef;



  //stats
  public total: number;

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
      }),
      shareReplay()
    );

    this.tags$ = this.tagService.getTags();
    this.tags$.subscribe(tags=>this.allTags = tags);

    this.filteredTags$ = combineLatest([this.tagFormControl.valueChanges.pipe(startWith('')), this.tagService.getTags()]).pipe(
      filter(([value, tags])=>value != null),
      filter(([value,tags])=>typeof value != 'number'), // super hacky but this way i can easily build my own autocomplete chip-input and not have to update angular materials version which would mean tons of re-preogramming of inputs. This happens because the value of the option is the tags id which is a number
      map(([value, tags]) => this._filterTags(value))
    );

    this.groupsWithSubgroups$.subscribe(el=>{
      this.groupsWithSubgroups = el;
    });

    this.categories$.subscribe(el=>{
      this.categories = el;
    });

    combineLatest([this.tags$, this.categories$, this.groupsWithSubgroups$]).pipe(take(1)).subscribe(()=>this.recalculate())
  }


  // gets called whenever an ipnput changed and calculates everything
  async recalculate(){
    this.expenseService.getExpensesWithoutUpdate("expenses").pipe(filter(expenses=>expenses.length >0), take(1)).subscribe(expenses=>{
      let filtered = expenses.filter(expense=>{
        if(expense.category !== parseInt(this.selectedCategory) && this.selectedCategory !== "999") return false;
        if(this.selectedGroup !== "999" && expense.group !== parseInt(this.selectedGroup)) return false;
        if(this.selectedTagIds.length >0 && !this.selectedTagIds.every(el=>expense.tags.includes(el))) return false
        return true;
      });
      this.total = filtered.reduce((acc,cur)=>{return acc+cur.amount},0)
    });
  }


  groupChanged(){
    this.selectedGroup$.next(this.selectedGroup);
    this.recalculate()
  }

  categoryChanged(){
    this.selectedGroup$.next(this.selectedCategory);
    this.recalculate();
  }


  public tagSelected(id: number){
    this.selectedTagIds.push(id);
    this.tagFormControl.setValue('');
    this.tagSelectInputElement.nativeElement.blur();
    this.recalculate();
  }

  public removeTag(tagId: number){
    this.selectedTagIds = this.selectedTagIds.filter(curTagId=>curTagId != tagId);
    this.tagFormControl.setValue('');
    this.recalculate();
  }

  private _filterTags(value: string): Tag[] {
    const filterValue = value.toLowerCase();
    return this.allTags.filter(tag => tag.name.toLowerCase().indexOf(filterValue) === 0).filter(tag => this.selectedTagIds.indexOf(tag.id) == -1);
  }

}
