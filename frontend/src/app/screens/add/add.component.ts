import { Component, OnInit, ViewChild, ElementRef, NgZone, AfterViewInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SliderService } from 'src/app/services/slider/slider.service';
import { Expense, ExpenseService } from 'src/app/services/expenses/expense.service';
import { CurrencyService } from 'src/app/services/currency/currency.service';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { take, map, startWith } from 'rxjs/operators';
import { GroupsService, GroupItem } from 'src/app/services/groups/groups.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { CategoryService } from 'src/app/services/category/category.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { FilterService } from 'src/app/services/filter/filter.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.less']
})
export class AddComponent implements OnInit, AfterViewInit {
  constructor(
    public sliderService: SliderService,
    public expenseService: ExpenseService,
    public groupsService: GroupsService,
    public categoryService: CategoryService,
    private filterService: FilterService,
    private _ngZone: NgZone,
    private currencyService: CurrencyService
  ) { }

  @ViewChild("focusInputAdd") public focusInput: ElementRef;
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this._ngZone.onStable.pipe(take(1)).subscribe(() => this.autosize.resizeToFitContent(true));
  }

  public expenseForm: FormGroup;
  public recurringForm: FormGroup;
  public selectedTabIndex: number;
  public currencyRates;
  public options: string[];
  public filteredOptions$: Observable<string[]>;
  public groups$: Observable<GroupItem[]>;
  public initialData: Expense;
  public isOnline = navigator.onLine;
public defaultCurrency = 'EUR';


  ngOnInit(): void {
    this.initialData = this.sliderService.currentExpenseForEdit;
    this.selectedTabIndex = (this.initialData?.lastUpdate) ? 1 : 0;

if (this.isOnline) {
  this.defaultCurrency = 'USD'
}


    this.expenseForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.maxLength(35)]),
      amount: new FormControl('', Validators.required),
      date: new FormControl(this.currentDate(), Validators.required),
      category: new FormControl(this.categoryService.defaultCategory, Validators.required),
      currency: new FormControl(this.defaultCurrency),
      group: new FormControl("General", Validators.required),
      description: new FormControl('', Validators.maxLength(200))
    });

    this.recurringForm = new FormGroup({
      name_recurring: new FormControl('', [Validators.required, Validators.maxLength(35)]),
      amount_recurring: new FormControl('', Validators.required),
      month_recurring: new FormControl(this.filterService.getCurrentMonthFilter(), Validators.required),
      category_recurring: new FormControl('general', Validators.required),
      group_recurring: new FormControl("General", Validators.required),
      currency_recurring: new FormControl(this.defaultCurrency),
      description_recurring: new FormControl('', Validators.maxLength(200)),
    });

    this.options = this.currencyService.getCurrencies();

    this.filteredOptions$ = this.expenseForm.get('currency').valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value))
    );
 
    //TODO : Dirty workaround
    if (this.initialData) {
      setTimeout(() => {
        if (this.initialData.lastUpdate) {
          this.recurringForm.reset({
            name_recurring: this.initialData.name,
            amount_recurring: this.initialData.amount,
            month_recurring: this.initialData.date.substring(0, 7),
            category_recurring: this.initialData.category,
            group_recurring: this.initialData.group,
            currency_recurring: 'EUR',
            description_recurring: this.initialData.description
          });
        } else {
          this.expenseForm.reset({
            name: this.initialData.name,
            amount: this.initialData.amount,
            date: this.initialData.date,
            category: this.initialData.category,
            group: this.initialData.group,
            currency: 'EUR',
            description: this.initialData.description
          });
        }
      }, 100);
    } else {
      setTimeout(() => {
        this.expenseForm.reset({
          name: '',
          amount: '',
          date: this.currentDate(),
          category: this.categoryService.defaultCategory,
          group: this.groupsService.defaultGroup,
          currency: this.defaultCurrency,
          description: ''
        })
      }, 100);
    }
    this.groups$ = this.groupsService.getGroupsWithoutUpdate();
  }

  ngAfterViewInit() {
    if (!this.initialData) {
      this.focusInput.nativeElement.focus();
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
  }


  tabChanged(e: MatTabChangeEvent) {
    this.selectedTabIndex = e.index;
  }

  hasError(controlName: string, errorName: string, formType: string) {
    if (formType === "single") {
      return this.expenseForm.controls[controlName].hasError(errorName);
    } else {
      return this.recurringForm?.controls[controlName]?.hasError(errorName);
    }
  }

  private setFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control.markAsTouched({ onlySelf: true });
    });
  }

  currentDate() {
    const currentDate = new Date();
    return `${currentDate.getFullYear()}-${this.filterService.parseMonth(currentDate.getMonth() + 1)}-${this.filterService.parseMonth(currentDate.getDate())}`;
  }

  clearCurrency(){
    this.valueBefore = this.expenseForm.get('currency').value;
    this.expenseForm.get('currency').setValue('');
  }

  private valueBefore: string;
  blurHandler(){
    //Ugly: no event to get the right timing to lnow when it blurred AND option was selected --> execute check after callstack emptied
    queueMicrotask(()=>{
      if(this.expenseForm.get('currency').value === ''){
        this.expenseForm.get('currency').setValue( this.valueBefore || 'EUR');
        this.valueBefore = undefined;
      }
    })
  }

  private currentlyAdding=false;

  async createExpense() {
    console.log('bool flag is: '+ this.currentlyAdding)
    if (this.selectedTabIndex === 0 && !this.currentlyAdding) {
      this.currentlyAdding = true;
      let expense = this.expenseForm.value;
      this.setFormGroupTouched(this.expenseForm);
      if (this.expenseForm.valid) {
        if (expense.currency && expense.currency !== 'EUR') {
          // foreign currency--> alter data
          let rate = (await this.currencyService.convertCurrency('EUR', expense.currency))[`EUR_${expense.currency}`]
          if(rate){
            expense.amount_foreign = expense.amount;
            expense.amount = parseFloat((expense.amount / rate).toFixed(2));
          }
        }

        if (!this.initialData) {
          this.expenseService.addExpense(expense, "expenses");
    
        } else {
          let key = this.initialData.key;
          if (this.initialData.recurring) {
            expense.recurring = true;
          }
          this.expenseService.updateExpense(key, expense, "expenses");
        }
        this.sliderService.hide();
      }
      this.currentlyAdding= false;
      
    } else {
      this.setFormGroupTouched(this.recurringForm);
      let expense = {
        name: this.recurringForm.value.name_recurring,
        amount: this.recurringForm.value.amount_recurring,
        date: this.recurringForm.value.month_recurring + "-01",
        category: this.recurringForm.value.category_recurring,
        group: this.recurringForm.value.group_recurring,
        description: this.recurringForm.value.description_recurring,
        recurring: true,
        lastUpdate: null
      };

      if (this.recurringForm.valid) {
        if (!this.initialData) {
          expense.lastUpdate = this.expenseService.getFormatDate(new Date());
          this.expenseService.addExpense(expense, "recurringExpenses");
        } else {
          expense.lastUpdate = this.initialData.lastUpdate
          this.expenseService.updateExpense(this.initialData.key, expense, "recurringExpenses")
        }
        this.sliderService.hide();
      }
      
    }
    
  }
}
