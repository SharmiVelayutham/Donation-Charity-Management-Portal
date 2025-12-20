export interface Donation {
  id: number;
  donationType: string;
  quantity: number;
  location: string;
  pickupDateTime: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  priority?: 'Normal' | 'Urgent';
}
