// Stub model file - using MySQL, not Mongoose
export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export interface ContributionModel {
  id: string;
  status: ContributionStatus;
}

