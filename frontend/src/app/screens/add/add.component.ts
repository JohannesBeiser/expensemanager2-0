import { Component, OnInit, ViewChild, ElementRef, NgZone, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SliderService } from 'src/app/services/slider/slider.service';
import { Expense, ExpenseService } from 'src/app/services/expenses/expense.service';
import { CurrencyService } from 'src/app/services/currency/currency.service';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { take, map, startWith, filter } from 'rxjs/operators';
import { GroupsService, Group } from 'src/app/services/groups/groups.service';
import { Observable, combineLatest } from 'rxjs';
import { CategoryService, Category, HardcodedCategories } from 'src/app/services/category/category.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { FilterService } from 'src/app/services/filter/filter.service';
import { HardcodedTags, Tag, TagService } from 'src/app/services/tag/tag.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.less']
})
export class AddComponent implements OnInit {
  constructor(
    public sliderService: SliderService,
    public expenseService: ExpenseService,
    public groupsService: GroupsService,
    public categoryService: CategoryService,
    public tagService: TagService,
    private filterService: FilterService,
    private _ngZone: NgZone,
    private currencyService: CurrencyService
  ) { }

  @ViewChild('tagSelectInputElement') tagSelectInputElement: ElementRef;
  @ViewChild("focusInputName") public focusInput: ElementRef;
  @ViewChild('autosize') autosize: CdkTextareaAutosize;
  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this._ngZone.onStable.pipe(take(1)).subscribe(() => this.autosize.resizeToFitContent(true));
  }

  public expenseForm: FormGroup;
  public recurringForm: FormGroup;
  public selectedTabIndex: number;
  public currencyRates;
  public options: string[]; // currency options
  public optionsOffline: string[]; // currency options
  public filteredOptions$:  Observable<string[]>;
  public filteredOfflineCurrencies$:  Observable<string[]>;
  public groups$: Observable<Group[]>;
  public categories$: Observable<Category[]>;
  public initialData: Expense;
  public isOnline = navigator.onLine;
  public defaultCurrency = 'EUR';
  tagFormControl: FormControl;
  public currentCategory: number;
  public categoryTagToggleValue: number;
  public isRecurring: boolean = false;
  //Tags
  public tags$: Observable<Tag[]>;
  public allTags: Tag[];
  public filteredTags$: Observable<Tag[]>; // always changing --> source of dropdown options
  public selectedTagIds: number[] = JSON.parse(localStorage.getItem("defaultTags")) || [];



  public numberInputShown: boolean = false;
  showNumberInput(){
    this.numberInputShown = true;
  }

  hideNumberInput(){
    this.numberInputShown = false;
  }

  numberInputNextClicked(){
    this.hideNumberInput();
    if(this.expenseForm.controls["name"].value == ""){
      this.focusInput.nativeElement.focus();
    }
  }

  public numberInputAmount= "0.00";
  private numberInputAmountInternal: string = "0";

  numberInputNumberPressed(num: number){
    this.numberInputAmountInternal+=num;
    this.numberInputAmount = (parseFloat(this.numberInputAmountInternal) /100).toFixed(2);
    this.expenseForm.controls["amount"].setValue(parseFloat(this.numberInputAmountInternal) /100);
  }

  numberInputDeletePressed(){
    this.numberInputAmountInternal = this.numberInputAmountInternal.substring(0,this.numberInputAmountInternal.length-1);
    if(this.numberInputAmountInternal==""){
      this.numberInputAmountInternal = "0"
    }
    this.numberInputAmount = (parseFloat(this.numberInputAmountInternal) /100).toFixed(2);
    this.expenseForm.controls["amount"].setValue(parseFloat(this.numberInputAmountInternal) /100)
  }

  ngOnInit(): void {
    this.initialData = this.sliderService.currentExpenseForEdit;

    if(!this.initialData){
      this.numberInputShown = true;
    }
    this.defaultCurrency = localStorage.getItem("defaultCurrency")

    //Code for food-tag toggle for tags groceries & eat-out
    this.currentCategory = this.initialData?.category || this.categoryService.defaultCategory;
    if(this.initialData?.tags.includes(1639339147966)){
      this.categoryTagToggleValue = 1639339147966
    }else if(this.initialData?.tags.includes(1639339152378)){
      this.categoryTagToggleValue = 1639339152378
    }

    this.selectedTabIndex = (this.initialData?.lastUpdate) ? 1 : 0;

    this.tagFormControl = new FormControl('');

    // if(this.groupsService.defaultGroup === 0){
    //   // general group--> expense gets "Non-Travel tag"
    //   this.selectedTagIds.push(1638199880620)
    // }else{
    //   this.selectedTagIds.push(1638199877164)
    // }

    this.expenseForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.maxLength(35)]),
      amount: new FormControl(0, Validators.required),
      date: new FormControl(this.currentDate(), Validators.required),
      category: new FormControl(this.categoryService.defaultCategory, Validators.required),
      currency: new FormControl(this.defaultCurrency),
      group: new FormControl(0, Validators.required),
      description: new FormControl('', Validators.maxLength(200))
    });

    this.recurringForm = new FormGroup({
      name_recurring: new FormControl('', [Validators.required, Validators.maxLength(35)]),
      amount_recurring: new FormControl('', Validators.required),
      month_recurring: new FormControl(this.filterService.getCurrentMonthFilter(), Validators.required),
      category_recurring: new FormControl('general', Validators.required),
      group_recurring: new FormControl(0, Validators.required),
      currency_recurring: new FormControl(this.defaultCurrency),
      description_recurring: new FormControl('', Validators.maxLength(200)),
    });

    this.options = this.currencyService.getCurrencies();
    this.optionsOffline = this.currencyService.getOfflineCurrencies();

    if (this.initialData) {
      this.initialData.tags.forEach(tag=>this.selectedTagIds.push(tag))
    }

    this.expenseForm.controls['group'].valueChanges.subscribe(value => {
      value = parseInt(value);
      if(value == 0){
        if(!this.selectedTagIds?.includes(1638199880620)){
          this.selectedTagIds.push(1638199880620);
          //if group changes to general --> add non-travel tag if not exists already and remove travel tag
          if(this.selectedTagIds?.includes(1638199877164)){
            let index = this.selectedTagIds.indexOf(1638199877164);
            if(index>-1){
              this.selectedTagIds.splice(index,1);
            }
          }
        }
      }
    });


    this.expenseForm.controls['category'].valueChanges.subscribe(value => {
      this.currentCategory = parseInt(value)
    });

    this.filteredOptions$ = this.expenseForm.get('currency').valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value))
    );

    this.filteredOfflineCurrencies$ = this.expenseForm.get('currency').valueChanges.pipe(
      startWith(''),
      map(value => this._filterOffline(value))
    );

    //TODO : Dirty workaround
    if (this.initialData) {
      this.selectedTagIds = this.initialData.tags || [];
      this.numberInputAmountInternal=this.initialData.amount.toString().replace('.','');
      this.numberInputAmount = (parseFloat(this.numberInputAmountInternal) /100).toFixed(2);
      this.isRecurring = this.initialData.recurring;
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
          amount: 0,
          date: this.currentDate(),
          category: this.categoryService.defaultCategory,
          group: this.groupsService.defaultGroup,
          currency: this.defaultCurrency,
          description: ''
        })
      }, 100);
    }

    this.groups$ = this.groupsService.getAllGroupsIncludingSubgroups();

    this.categories$ = this.categoryService.getCategoriesNew().pipe(map(categories=>categories.filter(category=> category.id !== 0)));

    this.tags$ = this.tagService.getTags();
    this.tags$.subscribe(tags=>this.allTags = tags);

    this.filteredTags$ = combineLatest(this.tagFormControl.valueChanges.pipe(startWith('')), this.tagService.getTags()).pipe(
      filter(([value, tags])=>value != null),
      filter(([value,tags])=>typeof value != 'number'), // super hacky but this way i can easily build my own autocomplete chip-input and not have to update angular materials version which would mean tons of re-preogramming of inputs. This happens because the value of the option is the tags id which is a number
      map(([value, tags]) => this._filterTags(value))
    );
  }


  nameChanged(e:any){
    let expenseName = this.expenseForm.controls['name'].value;

    { // Food
      let groceryTrigger=["Rewe", "Lidl", "Walmart", "Kaufland", "Grocery", "Groceri", "Lebensmittel", "Wocheneinkauf", "Netto", "Spar", "Aldi", "Edeka", "Bäcker"].map(el=>el.toLowerCase());
      let eatOutTrigger = ["Döner", "Restaurant", "Pizza", "Sushi", "essen gehen", "Burger", "Pommes", "fries", "mc donalds", "kfc", "subway", "Buffet"].map(el=>el.toLowerCase());
      //Add Tag Groceries
      if(groceryTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        // add grocery tag
        if(!this.selectedTagIds.includes(HardcodedTags.Groceries)){
          this.selectedTagIds.push(HardcodedTags.Groceries);
        }
        this.categoryTagToggleValue = HardcodedTags.Groceries;
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Food)
      }

      //Add Tag Eat-Out
      if(eatOutTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        // add Eat-Out tag
        if(!this.selectedTagIds.includes(HardcodedTags.EatOut)){
          this.selectedTagIds.push(HardcodedTags.EatOut);
        }
        this.categoryTagToggleValue = HardcodedTags.EatOut;
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Food)
      }

      //Resupply
      if(expenseName.includes("resupply")){
        if(!this.selectedTagIds.includes(HardcodedTags.Groceries)){
          this.selectedTagIds.push(HardcodedTags.Groceries);
        }
        if(!this.selectedTagIds.includes(HardcodedTags.Resupply)){
          this.selectedTagIds.push(HardcodedTags.Resupply);
        }
        this.categoryTagToggleValue = HardcodedTags.Groceries;
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Food)    }
      }

    { // Accommodation
      let hotelTrigger = ["Hotel", "Motel", "Lodge"].map(el=>el.toLowerCase());
      let hostelTrigger = ["Hostel"].map(el=>el.toLowerCase());
      let campingTrigger = ["Camping", "zelten", "tenting"].map(el=>el.toLowerCase());
      let rentTrigger = ["Miete", "rent"].map(el=>el.toLowerCase());

      if(hotelTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.HotelAirBnB)){
          this.selectedTagIds.push(HardcodedTags.HotelAirBnB);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Accommodation)
      }
      if(hostelTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Hostel)){
          this.selectedTagIds.push(HardcodedTags.Hostel);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Accommodation)
      }
      if(campingTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Camping)){
          this.selectedTagIds.push(HardcodedTags.Camping);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Accommodation)
      }
      if(rentTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Rent)){
          this.selectedTagIds.push(HardcodedTags.Rent);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Accommodation)
      }
    }

    { // Transport
      let taxiTrigger = ["taxi", "uber", "bla bla", "blabla"].map(el=>el.toLowerCase());
      let boatTrigger = ["schiff", "boat", "fähre", "ferry", "boot"].map(el=>el.toLowerCase());
      let flightTrigger = ["Flight", "flug", "flugzeug", "airplane"].map(el=>el.toLowerCase());
      let busTrigger = ["bus"].map(el=>el.toLowerCase());
      let trainTrigger = ["zug", "train"].map(el=>el.toLowerCase());

      if(taxiTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Taxi)){
          this.selectedTagIds.push(HardcodedTags.Taxi);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Transport)
      }
      if(boatTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Boat)){
          this.selectedTagIds.push(HardcodedTags.Boat);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Transport)
      }
      if(flightTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Flight)){
          this.selectedTagIds.push(HardcodedTags.Flight);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Transport)
      }
      if(busTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Bus)){
          this.selectedTagIds.push(HardcodedTags.Bus);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Transport)
      }
      if(trainTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Train)){
          this.selectedTagIds.push(HardcodedTags.Train);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.Transport)
      }
    }

    { // Other
      let haircutTrigger = ["barber", "haircut", "hairdresser", "friseur", "haarschnitt"].map(el=>el.toLowerCase());
      let shipmentTrigger = ["post", "usps", "dhl", "fedex", "ups", "paket", "versand","package"].map(el=>el.toLowerCase());
      let giftTrigger = ["gift", "geschenk", "donation", "spende"].map(el=>el.toLowerCase());


      if(haircutTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Hairdresser)){
          this.selectedTagIds.push(HardcodedTags.Hairdresser);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.General)
      }

      if(shipmentTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Shipment)){
          this.selectedTagIds.push(HardcodedTags.Shipment);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.General)
      }

      if(giftTrigger.some(el=>expenseName.toLowerCase().includes(el))){
        if(!this.selectedTagIds.includes(HardcodedTags.Gift)){
          this.selectedTagIds.push(HardcodedTags.Gift);
        }
        this.expenseForm.controls['category'].setValue(HardcodedCategories.General)
      }




    }

}


  setCategoryTagToggleValue(tagId: number){
    this.categoryTagToggleValue = tagId;
    if(tagId == 1639339147966 && !this.selectedTagIds?.includes(1639339147966)){
      this.selectedTagIds.push(1639339147966);
      //if groceries is selected, eat-out has to be removed if that exists in array
      if(this.selectedTagIds?.includes(1639339152378)){
        let index = this.selectedTagIds.indexOf(1639339152378);
        if(index>-1){
          this.selectedTagIds.splice(index,1);
        }
      }
    }
    if(tagId == 1639339152378 && !this.selectedTagIds?.includes(1639339152378)){
      this.selectedTagIds.push(1639339152378);

      //if eat-out is selected, grocveries has to be removed if that exists in array
      if(this.selectedTagIds?.includes(1639339147966)){
        let index = this.selectedTagIds.indexOf(1639339147966);
        if(index>-1){
          this.selectedTagIds.splice(index,1);
        }
      }
    }
   }



  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
  }

  private _filterOffline(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.optionsOffline.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
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
  }

  public removeTag(tagId: number){
    this.selectedTagIds = this.selectedTagIds.filter(curTagId=>curTagId != tagId);
    this.tagFormControl.setValue('');
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
      expense.recurring = !!this.isRecurring;
      expense.group = parseInt(expense.group);
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

        expense.category = parseInt(expense.category);
        expense.tags = this.selectedTagIds;

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
        category: parseInt(this.recurringForm.value.category_recurring),
        group: parseInt(this.recurringForm.value.group_recurring),
        tags: this.selectedTagIds,
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
