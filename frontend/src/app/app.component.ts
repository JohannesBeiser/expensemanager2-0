import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationStart } from '@angular/router';
import { slideInAnimation } from './animations';
import { SliderService } from './services/slider/slider.service';
import { filter } from 'rxjs/operators';
import { FilterService } from './services/filter/filter.service';
import { combineLatest } from 'rxjs';
import { DatePipe } from '@angular/common';
import { GroupsService } from './services/groups/groups.service';
import { HttpClient } from '@angular/common/http';
import { Expense, ExpenseService } from './services/expenses/expense.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  animations: [
    slideInAnimation
    // animation triggers go here
  ]
})
export class AppComponent implements OnInit{
  title = 'Expenses';
  public appHeadline: string = "ExpenseManager";

  public currentFilter$ = this.filterService.getFilter();
  public groups$ = this.groupService.getGroups().pipe(filter(groups=> groups.length>0));
  public filterTitles: { date: string; group: string } = null;

  constructor(
    private router: Router,
    public sliderService: SliderService,
    public filterService: FilterService,
    public groupService: GroupsService,
    private datePipe: DatePipe,
    private http: HttpClient,
    private expenseService: ExpenseService
  ) {
    router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      let url = event.url.substring(1);
      switch (url) {
        case "home":
          this.appHeadline = "Overview";
          break;
        case "groups":
          this.appHeadline = "Groups";
          this.resetTemporary();
          break;
        case "settings":
          this.appHeadline = "Settings";
          this.resetTemporary();
          break;
        case "settings/recurring":
        this.appHeadline = "Settings";
        this.resetTemporary();
        break;
        case "settings/general":
        this.appHeadline = "Settings";
        this.resetTemporary();
        break;
        case "settings/groups":
        this.appHeadline = "Settings";
        this.resetTemporary();
        break;
        case "settings/defaults":
        this.appHeadline = "Settings";
        this.resetTemporary();
        break;
        case "settings/categories":
          this.appHeadline = "Settings";
          this.resetTemporary();
          break;
        case "settings/tags":
          this.appHeadline = "Settings";
          this.resetTemporary();
          break;
        case "settings/about":
          this.appHeadline = "Settings";
          this.resetTemporary();
          break;
        case "income":
        this.appHeadline = "Income";
        this.resetTemporary();
        break;
        case "analysis":
          this.appHeadline = "Analysis";
          this.resetTemporary();
          break;
        default:
          this.appHeadline = "Overview";
          break;
      }
    });
  }

  ngOnInit(){

    setTimeout(() => {
      this.http.get('/expenseQueue').subscribe(res=>{ //for dev this was http://localhost:3000
        console.log("received http request from /expenseQueue")
        let defaultGroup = parseInt(localStorage.getItem("defaultGroup"));
        let defaultTags = JSON.parse(localStorage.getItem("defaultTags")) || [];

        (res as any).expenses.forEach((expense)=>{
          let expenseToAdd: Expense= {
            name: expense.name,
            amount: expense.amount,
            category: 0,
            group: defaultGroup,
            date: format(new Date(), "yyyy-MM-dd"),
            tags: defaultTags
          }
          let autofilledExpense = this.expenseService.getAutofilledExpense(expenseToAdd);

          if(expense.category){
            //categroy was provided via siri manually after server realized it cant be interpolated thus ending up being ignored when syncing - siri asked and received a category - should override
            autofilledExpense.category = expense.category;
          }

          if(autofilledExpense.category>0){
            this.expenseService.addExpense(autofilledExpense, "expenses")
            console.log("expense from server synced")
          }else{
            alert(`expense couldn't be added from server since it couldnt be autofilled. Name: ${autofilledExpense.name}, Amount: ${autofilledExpense.amount}, categroy: ${autofilledExpense.category}`)
          }
        });
        if((res as any).expenses.length >0){
          alert(`${(res as any).expenses.length} expenses synced from server`)
          this.http.get('/clearExpenseQueue').subscribe(res=>{
            if(!(res as any).success){
              alert("reset of server-expense-queue failed")
            }
          })
        }
      })
    }, 100);


    combineLatest(this.currentFilter$, this.filterService.monthSwitched$, this.groups$).subscribe(([filter, monthSwitch,groups]) => {
        let tempString = {
          date: null,
          group: null
        }
        if (monthSwitch) {
          tempString.date = this.datePipe.transform(`${monthSwitch.year}-${monthSwitch.month}-01`, 'MMM y');
        } else {
          if (filter.date) {
            tempString.date = this.datePipe.transform(`${filter.date.year}-${filter.date.month}-01`, 'MMM y');
          }else if(filter.last30Active){
            tempString.date = "Last 30 days"
          }
        }

        if (filter.groups) {
          // TODO not just first but all
          tempString.group = `${this.groupService.getGroupById(filter.groups[0]).name}`;
          for(let i=1; i<filter.groups.length;i++){
            tempString.group += `, ${this.groupService.getGroupById(filter.groups[i]).name}`
          }
        }
        this.filterTitles = tempString;
    })
  }

  resetTemporary(){
    this.filterService.resetFilter();
    // this.router.navigate(['/groups']);
  }

  navigateBack(){
    window.history.go(-1);
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
