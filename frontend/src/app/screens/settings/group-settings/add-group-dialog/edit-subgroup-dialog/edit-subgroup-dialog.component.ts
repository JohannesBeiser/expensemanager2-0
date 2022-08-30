import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Group, GroupsService, Subgroup } from 'src/app/services/groups/groups.service';
import { AddCategoryDialogComponent } from '../../../category-settings/add-category-dialog/add-category-dialog.component';

@Component({
  selector: 'app-edit-subgroup-dialog',
  templateUrl: './edit-subgroup-dialog.component.html',
  styleUrls: ['./edit-subgroup-dialog.component.less']
})
export class EditSubgroupDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public subgroup: Subgroup,
    private dialogRef: MatDialogRef<AddCategoryDialogComponent>,
    public dialog: MatDialog,
  ) { }

  public subgroupName: string;
  public nestedSubgroups: Subgroup[] = [];


  ngOnInit(): void {
    this.subgroupName = this.subgroup?.name || "";
    this.nestedSubgroups = this.subgroup?.subgroups || [];
  }

  submit(){
    if(this.subgroup){
      this.dialogRef.close({...this.subgroup, name: this.subgroupName, subgroups: this.nestedSubgroups})
    }else{
      //add new
      this.dialogRef.close({name: this.subgroupName, id: Date.now(), subgroups: this.nestedSubgroups})
    }
  }

  addSubgroup(){
    const dialogRef = this.dialog.open(EditSubgroupDialogComponent); // add initial data here

    dialogRef.afterClosed().subscribe((result: Subgroup) => {
      if(!result) return;
      this.nestedSubgroups.push(result);
    });
    // if(this.subgroupInputValue == ""){
    //   this.subgroupInputControl?.nativeElement.focus();
    // }else{
    //   this.subgroups.push({name: this.subgroupInputValue, id: Date.now()});
    //   this.subgroupInputValue = "";
    // }
  }

  editSubgroup(subgroup: Subgroup){
    const dialogRef = this.dialog.open(EditSubgroupDialogComponent, {data: subgroup}); // add initial data here

    dialogRef.afterClosed().subscribe((result: Subgroup) => {
      debugger;
      this.nestedSubgroups.find(el=>el.id == result?.id).name = result?.name;
    });
  }

  deleteSubgroup(subgroup: Subgroup){
    if(confirm(`Do you really want to delete '${subgroup.name}' premanently? `)){
      this.nestedSubgroups = this.nestedSubgroups.filter(el=> el.id !== subgroup.id);
    }
  }

}
