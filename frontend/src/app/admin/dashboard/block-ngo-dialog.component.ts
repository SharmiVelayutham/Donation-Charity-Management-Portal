import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-block-ngo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Block NGO</h2>
    <mat-dialog-content>
      <p>Please provide a reason for blocking <strong>{{ data.ngoName }}</strong> (admin records only):</p>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Block Reason</mat-label>
        <textarea
          matInput
          [(ngModel)]="reason"
          rows="4"
          placeholder="Enter reason for blocking this NGO..."
          required
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()" [disabled]="!reason || reason.trim().length === 0">
        Block NGO
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 20px 24px;
    }
    mat-form-field {
      margin-top: 16px;
    }
    mat-dialog-actions {
      padding: 8px 24px 16px;
    }
  `]
})
export class BlockNgoDialogComponent {
  reason: string = '';

  constructor(
    public dialogRef: MatDialogRef<BlockNgoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { ngoName: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.reason && this.reason.trim().length > 0) {
      this.dialogRef.close({ reason: this.reason.trim() });
    }
  }
}

