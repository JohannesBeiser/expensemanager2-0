import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { format } from 'date-fns';
import { Income, IncomeService } from 'src/app/services/income/income.service';

@Component({
  selector: 'app-add-income-modal',
  templateUrl: './add-income-modal.component.html',
  styleUrls: ['./add-income-modal.component.less']
})
export class AddIncomeModalComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public incomeToEdit: Income,
    private incomeService: IncomeService,
    private dialogRef: MatDialogRef<AddIncomeModalComponent>
  ) { }

  public incomeForm: FormGroup;

  ngOnInit(): void {
    let date = this.incomeToEdit?.id ? format(new Date(this.incomeToEdit?.date), 'yyyy-MM-dd') : format(new Date(),'yyyy-MM-dd');
    this.incomeForm = new FormGroup({
      amount_net: new FormControl(this.incomeToEdit?.amount_net || null, [Validators.required]),
      amount_gross: new FormControl(this.incomeToEdit?.amount_gross || null, [Validators.required]),
      group: new FormControl(this.incomeToEdit?.group || '', [Validators.required]),
      date: new FormControl(date, [Validators.required]),
    });
  }

  hasError(controlName: string, errorName: string) {
    return this.incomeForm.controls[controlName].hasError(errorName);
  }

  async submit() {
    let newIncomeEntry = this.incomeForm.value;
    newIncomeEntry.date = new Date(this.incomeForm.value.date).getTime();
    debugger;

    this.setFormGroupTouched(this.incomeForm);
    if (this.incomeForm.valid) {
      if(this.incomeToEdit){
        this.incomeService.editIncome({...newIncomeEntry, id: this.incomeToEdit.id}, this.incomeToEdit.key)
      }else{
        this.incomeService.addIncome(newIncomeEntry);
      }

      this.closeDialog();
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
  }

}
