import { BrowserModule } from '@angular/platform-browser';
import { NgModule, LOCALE_ID } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AddComponent } from './screens/add/add.component';
import { HomeComponent } from './screens/home/home.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SettingsComponent } from './screens/settings/settings.component';
import { MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatNativeDateModule, MatPseudoCheckbox } from '@angular/material/core';
import { GroupsComponent } from './screens/groups/groups.component';
import { SearchComponent } from './screens/search/search.component';
import {MatChipsModule} from '@angular/material/chips';
import { FilterComponent } from './screens/filter/filter.component';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import { PrettyCurrencyPipe } from './pipes/pretty-currency.pipe';
import { DatePipe } from '@angular/common';
import {MatRadioModule} from '@angular/material/radio';
import { DateDurationPipe } from './pipes/date-duration.pipe';
import { DateLongShortPipe } from './pipes/date-long-short.pipe';
import { ExpenseListComponent } from './components/expense-list/expense-list.component';
import { EditComponent } from './screens/edit/edit.component';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import { ExpenseBottomSheetComponent } from './components/expense-list/expense-bottom-sheet/expense-bottom-sheet.component';
import { SettingsBottomSheetComponent } from './screens/settings/settings-bottom-sheet/settings-bottom-sheet.component';
import {MatTabsModule} from '@angular/material/tabs';
import { RecurringExpenseListComponent } from './components/recurring-expense-list/recurring-expense-list.component';
import { RecurringExpenseBottomSheetComponent } from './components/recurring-expense-list/expense-bottom-sheet/recurring-expense-bottom-sheet.component';
import { DurationWeekDayPipe } from './pipes/duration-week-day.pipe';
import { HighchartsChartModule } from 'highcharts-angular';
import {HttpClientModule} from "@angular/common/http";
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { SttRecorderComponent } from './components/stt-recorder/stt-recorder.component';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { IncomeComponent } from './screens/income/income.component';
import { AnalysisComponent } from './screens/analysis/analysis.component';
import { RecurringComponent } from './screens/settings/recurring/recurring.component';
import { GeneralComponent } from './screens/settings/general/general.component';
import { DefaultsComponent } from './screens/settings/defaults/defaults.component';
import { GroupSettingsComponent } from './screens/settings/group-settings/group-settings.component';
import { CategorySettingsComponent } from './screens/settings/category-settings/category-settings.component';
import { AddCategoryDialogComponent } from './screens/settings/category-settings/add-category-dialog/add-category-dialog.component';
import { CategorySettingsBottomSheetComponent } from './screens/settings/category-settings/category-settings-bottom-sheet/category-settings-bottom-sheet.component';
import { AddGroupDialogComponent } from './screens/settings/group-settings/add-group-dialog/add-group-dialog.component';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { EditSubgroupDialogComponent } from './screens/settings/group-settings/add-group-dialog/edit-subgroup-dialog/edit-subgroup-dialog.component';
import { AllTimeAnalysisComponent } from './screens/analysis/all-time-analysis/all-time-analysis.component';
import { YearAnalysisComponent } from './screens/analysis/year-analysis/year-analysis.component';
import { MonthAnalysisComponent } from './screens/analysis/month-analysis/month-analysis.component';
import { CustomAnalysisComponent } from './screens/analysis/custom-analysis/custom-analysis.component';
import { RationBarComponent } from './components/charts/ration-bar/ration-bar.component';
import { CardComponent } from './components/card/card.component';
import { ExpenseListDialogComponent } from './screens/analysis/expense-list-dialog/expense-list-dialog.component';
import { TagSettingsComponent } from './screens/settings/tag-settings/tag-settings.component';
import { AddTagDialogComponent } from './screens/settings/tag-settings/add-tag-dialog/add-tag-dialog.component';
import { TagSettingsBottomSheetComponent } from './screens/settings/tag-settings/tag-settings-bottom-sheet/tag-settings-bottom-sheet.component';
import { TagListComponent } from './components/tag-list/tag-list.component';
import { AboutComponent } from './screens/settings/about/about.component';
import { SubgroupCardComponent } from './components/subgroup-card/subgroup-card.component';
import { IncomeListItemComponent } from './screens/income/income-list-item/income-list-item.component';
import { IncomeItemBottomSheetComponent } from './screens/income/income-list-item/income-item-bottom-sheet/income-item-bottom-sheet.component';
import { AddIncomeModalComponent } from './screens/income/add-income-modal/add-income-modal.component'

registerLocaleData(localeDe, 'de');

@NgModule({
  declarations: [
    AppComponent,
    AddComponent,
    HomeComponent,
    HeaderComponent,
    FooterComponent,
    SettingsComponent,
    GroupsComponent,
    SearchComponent,
    FilterComponent,
    PrettyCurrencyPipe,
    DateDurationPipe,
    DateLongShortPipe,
    ExpenseListComponent,
    EditComponent,
    ExpenseBottomSheetComponent,
    SettingsBottomSheetComponent,
    RecurringExpenseListComponent,
    RecurringExpenseBottomSheetComponent,
    DurationWeekDayPipe,
    SttRecorderComponent,
    IncomeComponent,
    AnalysisComponent,
    RecurringComponent,
    GeneralComponent,
    DefaultsComponent,
    GroupSettingsComponent,
    CategorySettingsComponent,
    AddCategoryDialogComponent,
    CategorySettingsBottomSheetComponent,
    AddGroupDialogComponent,
    EditSubgroupDialogComponent,
    AllTimeAnalysisComponent,
    YearAnalysisComponent,
    MonthAnalysisComponent,
    CustomAnalysisComponent,
    RationBarComponent,
    CardComponent,
    ExpenseListDialogComponent,
    TagSettingsComponent,
    AddTagDialogComponent,
    TagSettingsBottomSheetComponent,
    TagListComponent,
    AboutComponent,
    SubgroupCardComponent,
    IncomeListItemComponent,
    IncomeItemBottomSheetComponent,
    AddIncomeModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatBottomSheetModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatRadioModule,
    FormsModule,
    HighchartsChartModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [
    DatePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
