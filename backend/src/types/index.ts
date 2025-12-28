
export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

export type DonationCategory = 'CLOTHES' | 'FOOD' | 'MONEY';

export type DonationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type PickupStatus = 'SCHEDULED' | 'PICKED_UP' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type Priority = 'NORMAL' | 'URGENT';
export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'NGO';
  contact_info: string;
  is_blocked: boolean;
  created_at: Date;
}
export interface IDonor {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'DONOR';
  contact_info: string;
  phone_number?: string;
  full_address?: string;
  is_blocked: boolean;
  created_at: Date;
}
export interface IAdmin {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'ADMIN';
  contact_info: string;
  created_at: Date;
}
export interface IDonation {
  id: number;
  ngo_id: number;
  donation_category?: DonationCategory;
  purpose?: string;
  description?: string;
  quantity_or_amount: number;
  pickup_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  timezone?: string;
  pickup_date_time?: Date;
  priority?: Priority;
  status: DonationStatus;
  created_at: Date;
  updated_at: Date;
}
export interface IContribution {
  id: number;
  donation_id: number;
  donor_id: number;
  ngo_id: number;
  donation_type: DonationCategory;
  quantity_or_amount: number;
  pickup_scheduled_date_time: Date;
  donor_address: string;
  donor_contact_number: string;
  pickup_status: PickupStatus;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
export interface IPayment {
  id: number;
  donation_id: number;
  donor_id: number;
  ngo_id: number;
  amount: number;
  transaction_reference_id: string;
  donor_provided_reference?: string;
  payment_status: PaymentStatus;
  verified_by_role?: 'NGO' | 'ADMIN';
  verified_by_id?: number;
  verified_at?: Date;
  created_at: Date;
}

