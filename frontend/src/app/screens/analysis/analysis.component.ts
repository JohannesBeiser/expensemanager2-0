import { Component, OnInit } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { isThisQuarter } from 'date-fns';
import { AnalysisService, AnalysisTabTypes } from 'src/app/services/analysis/analysis.service';
import { Restriction } from './all-time-analysis/all-time-analysis.component';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.less']
})
export class AnalysisComponent implements OnInit {

  constructor(
    private analysisService: AnalysisService
  ) { }

  public selectedTabIndex: number;
  public selectedYear: number;
  public selectedRestriction: Restriction;

  ngOnInit(): void {

    this.selectedTabIndex = ["all_time", "year", "month", "custom"].indexOf(this.analysisService.getCurrentTabOpened()) || 0
    // iterate over all expenses matching the tabs setting ( year, month etc)
    // then accumulate for each expense all the final data needed to shw all facts,
    // so only 1 iteration through all expenses is needed
    // do that actually in the 4 sub-components, thisn here is justa  dumb wrapper component
  }

  restrictionChanged(restriction: Restriction){
    this.selectedRestriction = restriction;
  }

  tabSelected(event: MatTabChangeEvent){
    this.selectedYear = this.analysisService.getInitialYear();
    this.selectedRestriction = this.analysisService.getInitialRestriction();
    let tab = ["all_time", "year", "month", "custom"][event.index] as AnalysisTabTypes
    this.analysisService.setTab(tab);
  }

  openTab(tab: AnalysisTabTypes){
    this.analysisService.setTab(tab);
  }

  yearClicked(event: {year: number, restriction: Restriction}){
    this.analysisService.setTab("year");
    this.selectedTabIndex = 1;
    this.selectedYear = event.year;
    this.selectedRestriction = event.restriction;
  }

}
