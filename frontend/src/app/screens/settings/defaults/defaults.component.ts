import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GroupsService, Group } from 'src/app/services/groups/groups.service';
import { CategoryService, Category } from 'src/app/services/category/category.service';
import { Observable } from 'rxjs';
import { map,startWith, filter} from 'rxjs/operators';
import { el } from 'date-fns/locale';
import { Tag, TagService } from 'src/app/services/tag/tag.service';
import { FormControl } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { CurrencyService } from 'src/app/services/currency/currency.service';

@Component({
  selector: 'app-defaults',
  templateUrl: './defaults.component.html',
  styleUrls: ['./defaults.component.less']
})
export class DefaultsComponent implements OnInit {

  @ViewChild('tagSelectInputElement') tagSelectInputElement: ElementRef;


  constructor(
    private groupsService: GroupsService,
    private categoryService: CategoryService,
    public tagService: TagService,
    private currencyService: CurrencyService
  ) { }

  public groupsWithSubgroups$: Observable<Group[]>;
  public categories$: Observable<Category[]>;
  public currencies: string[];
  public defaultGroupSelected: number;
  public defaultCategorySelected: number;
  public defaultCurrencySelected: string;

  public selectedTagIds: number[] = [];
  tagFormControl: FormControl;
  public allTags: Tag[];
  public filteredTags$: Observable<Tag[]>; // always changing --> source of dropdown options
  public tags$: Observable<Tag[]>;



  ngOnInit(): void {
    this.currencies = this.currencyService.getOfflineCurrencies();
    this.tagFormControl = new FormControl('');
    this.selectedTagIds = JSON.parse(localStorage.getItem("defaultTags")) || [];

    this.groupsWithSubgroups$ = this.groupsService.getGroups().pipe(
      map(groups=> groups.filter(group=> group.active)),
      map(groups=>{
        return groups.reduce((acc,cur)=>{
          acc.push(cur);
          cur.subgroups.forEach(subgroup=>acc.push(subgroup));
          return acc;
        },[] as Group[])
      })
    );

    this.categories$ = this.categoryService.getCategoriesNew().pipe(map(categories=> categories.filter(category=> category.id !== 0)));

        //TODO : Dirty workaround
    setTimeout(() => {
      this.defaultGroupSelected = this.groupsService.defaultGroup;
      this.defaultCategorySelected = this.categoryService.defaultCategory;
      this.defaultCurrencySelected = localStorage.getItem("defaultCurrency")
    }, 100);

    this.tags$ = this.tagService.getTags();
    this.tags$.subscribe(tags=>this.allTags = tags);

    this.filteredTags$ = combineLatest(this.tagFormControl.valueChanges.pipe(startWith('')), this.tagService.getTags()).pipe(
      filter(([value, tags])=>value != null),
      filter(([value,tags])=>typeof value != 'number'), // super hacky but this way i can easily build my own autocomplete chip-input and not have to update angular materials version which would mean tons of re-preogramming of inputs. This happens because the value of the option is the tags id which is a number
      map(([value, tags]) => this._filterTags(value))
    );
  }


  defaultCurrencyChanged(){
    localStorage.setItem("defaultCurrency", this.defaultCurrencySelected)
  }

  // Tag functions
  private _filterTags(value: string): Tag[] {
    const filterValue = value.toLowerCase();
    return this.allTags.filter(tag => tag.name.toLowerCase().indexOf(filterValue) === 0).filter(tag => this.selectedTagIds.indexOf(tag.id) == -1);
  }

  public tagSelected(id: number){
    this.selectedTagIds.push(id);
    this.tagFormControl.setValue('');
    this.tagSelectInputElement.nativeElement.blur();
    this.tagSelectionChanged()
  }

  public removeTag(tagId: number){
    this.selectedTagIds = this.selectedTagIds.filter(curTagId=>curTagId != tagId);
    this.tagFormControl.setValue('');
    this.tagSelectionChanged()
  }

  tagSelectionChanged(){
    localStorage.setItem("defaultTags", JSON.stringify(this.selectedTagIds));
  }


  /**
   * call group/category service and update currently selected in subnject and localstorage
   */
  public defaultGroupChanged() {
    this.groupsService.setDefaultGroup(this.defaultGroupSelected);
  }

  /**
   * call group/category service and update currently selected in subnject and localstorage
   */
  public defaultCategoryChanged() {
    this.categoryService.setDefaultCategory(this.defaultCategorySelected);
  }


}
