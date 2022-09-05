import { Component, OnInit } from '@angular/core';
import { GroupsService, Group } from 'src/app/services/groups/groups.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { SettingsBottomSheetComponent } from '../settings-bottom-sheet/settings-bottom-sheet.component';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AddGroupDialogComponent } from './add-group-dialog/add-group-dialog.component';
import { trigger, state, style, transition, animate } from '@angular/animations';


@Component({
  selector: 'app-group-settings',
  animations: [
    trigger('slideInOut', [
      state('out', style({
        opacity: '0',
        overflow: 'hidden',
        height: '0px',
      })),
      state('in', style({
        opacity: '1',
        overflow: 'hidden',
        height: '*',
      })),
      transition('out => in', animate('150ms ease-in-out')),
      transition('in => out', animate('150ms ease-in-out'))
    ])
  ],
  templateUrl: './group-settings.component.html',
  styleUrls: ['./group-settings.component.less']
})
export class GroupSettingsComponent implements OnInit {

  constructor(
    private groupsService: GroupsService,
    private bottomSheet: MatBottomSheet,
    public dialog: MatDialog,
  ) { }


  public groups$: Observable<Group[]>;
  public expandedGroup: Group;

  ngOnInit(): void {


    this.groups$ = this.groupsService.getGroups().pipe(
      map(groups => {
        return groups.filter(group => group.id !== 0).reverse();
      })
    );
  }

  expand(index: number) {
    if (this.helper[index]) {
      //already exists --> is open
      this.helper = {};
    } else {
      this.helper = {};
      this.helper[index] = 'in';
    }
  }

  public helper = {}
  helpMenuOpenForIndex(index: number): string {
    return this.helper[index] || 'out';
  }

  openDialog() {
    const dialogRef = this.dialog.open(AddGroupDialogComponent); // add initial data here

    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });
  }

  openBottomSheet(e: MouseEvent, group: Group): void {
    document.body.style.backgroundColor = "#4f5053";
    e.stopPropagation();
    this.bottomSheet.open(SettingsBottomSheetComponent, { data: group });
  }
}
