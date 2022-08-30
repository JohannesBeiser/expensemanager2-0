import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { GroupsService, Group } from 'src/app/services/groups/groups.service';
import { FilterService, ExpenseFilter } from 'src/app/services/filter/filter.service';
import {  skip, filter, map, } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.less']
})
export class FilterComponent implements OnInit {

  @ViewChild("monthPickerInput") public monthPickerInputElement: ElementRef;
  @ViewChild("groupPickerInput") public groupPickerInputElement: ElementRef;

  public groupsWithSubgroups$: Observable<Group[]>;

  //Filters
  public dateSelected: string;
  public groupsSelected: number[];
  public allDatesSelected: boolean;
  public allGroupsSelected: boolean;

  sortMethod: string;
  sortMethods: string[] = ['date', 'amount'];
  monthMethod: string;


  constructor(
    public groupService: GroupsService,
    private filterService: FilterService
  ) { }

  ngOnInit(): void {
    this.groupsWithSubgroups$ = this.groupService.getGroups().pipe(
      map(groups=>{
        return groups.reduce((acc,cur)=>{
          acc.push(cur);
          let subgroups = this.groupService.getSubgroupsRecursive(cur) || [];
          acc.push(...subgroups);
          return acc;
        },[] as Group[])
      })
    );

    this.filterService.filterState$.subscribe((state) => {
      //FIXME : quick workaround for testing
      setTimeout(() => {
          if (state.date) {
            this.dateSelected = `${state.date.year}-${state.date.month}`;
            this.monthMethod = "specific";
          } else {
            this.dateSelected = null;
            if(state.last30Active){
              this.monthMethod = "last30"
            }else{
              this.monthMethod = "all";
            }
          }
          if (state.groups) {
            this.groupsSelected = state.groups;
            this.allGroupsSelected = false;
          } else {
            this.groupsSelected = null;
            this.allGroupsSelected = true;
          }
      }, 200);
    });


  this.filterService.filterShown$.pipe(
    skip(1),
    filter((val) => !val)
    ).subscribe((isShown) => {
      this.submitFilter();
  })

    this.sortMethod = localStorage.getItem("sortMethod") || "date";
  }

  removeGroupFilter(index:number){
    this.groupsSelected.splice(index,1);
  }

  getGroupById(id: number){
    return this.groupService.getGroupById(id);
  }

  groupChanged(e: any) {
    this.allGroupsSelected = !e.checked;
    if(e.checked){
        this.groupsSelected= [0]; // if newly switched on just one with default general
    }
  }

  dateChanged(e: any) {
    if(e.value == 'specific'){
      this.dateSelected= this.filterService.getCurrentMonthFilter();
    }
  }


  submitFilter() {
    let currentFilter = JSON.parse(localStorage.getItem("filter"))

    let newFilter: Partial<ExpenseFilter>= {}
    if(!this.allGroupsSelected){
      newFilter.groups=this.groupsSelected;
    }

    if(this.monthMethod == 'specific'){
      newFilter.date={
        month: this.dateSelected.substring(5),
        year: this.dateSelected.substring(0, 4)
      }
      newFilter.last30Active= false;
    }else if(this.monthMethod == 'all'){
      newFilter.last30Active = false;
    }else{
      newFilter.last30Active= true;
    }

    let currentSortMethod= localStorage.getItem("sortMethod");
    if(this.sortMethod !== currentSortMethod){
      this.filterService.setSortMethod(this.sortMethod);
    }

    if(JSON.stringify(currentFilter) !== JSON.stringify(newFilter)){
      this.filterService.setFilter(newFilter)
    }
  }
}
