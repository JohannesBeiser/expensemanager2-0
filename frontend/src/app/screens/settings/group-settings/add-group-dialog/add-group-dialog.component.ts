import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Category } from 'src/app/services/category/category.service';
import { Group, GroupsService, Subgroup } from 'src/app/services/groups/groups.service';
import { AddCategoryDialogComponent } from '../../category-settings/add-category-dialog/add-category-dialog.component';
import { EditSubgroupDialogComponent } from './edit-subgroup-dialog/edit-subgroup-dialog.component';

@Component({
  selector: 'app-add-group-dialog',
  templateUrl: './add-group-dialog.component.html',
  styleUrls: ['./add-group-dialog.component.less']
})
export class AddGroupDialogComponent implements OnInit {
  public isActive: boolean = true;

  @ViewChild("subgroupInputControl") public subgroupInputControl: ElementRef;
  public subgroupInputValue: string = "";
  public groupForm: FormGroup;
  public subgroups: Subgroup[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public groupToEdit: Group,
    private dialogRef: MatDialogRef<AddCategoryDialogComponent>,
    private groupService: GroupsService,
    public dialog: MatDialog,
  ) {
    this.subgroups= []
   }

  ngOnInit(): void {
    if(this.groupToEdit  && this.groupToEdit.active == false){
      this.isActive = false;
    }
    this.groupForm = new FormGroup({
      name: new FormControl(this.groupToEdit?.name || '', [Validators.required, Validators.maxLength(35)])
    });

    if(this.groupToEdit){
      this.subgroups= this.groupToEdit.subgroups;
    }
  }

  hasError(controlName: string, errorName: string) {
    return this.groupForm.controls[controlName].hasError(errorName);
  }

  addSubgroup(){
    const dialogRef = this.dialog.open(EditSubgroupDialogComponent); // add initial data here

    dialogRef.afterClosed().subscribe((result: Subgroup) => {
      if(!result) return;
      this.subgroups.push(result);
    });
    // if(this.subgroupInputValue == ""){
    //   this.subgroupInputControl?.nativeElement.focus();
    // }else{
    //   this.subgroups.push({name: this.subgroupInputValue, id: Date.now()});
    //   this.subgroupInputValue = "";
    // }
  }

  async submit() {
    this.setFormGroupTouched(this.groupForm);
    if (this.groupForm.valid) {
      if(this.groupToEdit){
        let group: Group = {
          name: this.groupForm.value.name,
          active: this.isActive,
          subgroups: this.subgroups,
          id: this.groupToEdit.id
        }
        this.groupService.updateGroup(this.groupToEdit.key, group);
      }else{
        let group: Group = {
          name: this.groupForm.value.name,
          active: this.isActive,
          subgroups: this.subgroups,
          id: Date.now()
        }
        this.groupService.addGroup(group);
      }

      this.closeDialog();
    }
  }

  editSubgroupName(subgroup: Subgroup){
    const dialogRef = this.dialog.open(EditSubgroupDialogComponent, {data: subgroup}); // add initial data here

    dialogRef.afterClosed().subscribe((result: Subgroup) => {
      debugger;
      this.subgroups.find(el=>el.id == result?.id).name = result?.name;
      this.subgroups.find(el=>el.id == result?.id).subgroups = result?.subgroups || [];
    });
  }

  deleteSubgroup(subgroup: Subgroup){
    if(confirm(`Do you really want to delete '${subgroup.name}' premanently? `)){
      this.subgroups = this.subgroups.filter(el=> el.id !== subgroup.id);
    }
  }

  private setFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control.markAsTouched({ onlySelf: true });
    });
  }

  closeDialog() {
    this.dialogRef.close();
    this.subgroups = []
  }

}
