export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type TicketTier = 'General' | 'VIP' | 'Speaker' | 'Staff' | 'Estudiante' | 'Sponsor';

export interface Participant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tier: TicketTier;
  registeredAt: string;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  paymentProofUrl?: string;
  paymentReference?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  ticketSentAt?: string;
  qrCodeUrl?: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  notes?: string;
}

export interface EventConfig {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  googleFormUrl: string;
  googleSlidesUrl: string;
  organizerEmail: string;
  organizerName: string;
  customEmailSubject: string;
  customEmailBody: string;
  bgGradient: string;
}

export interface Stats {
  totalRegistered: number;
  pendingPayment: number;
  verifiedPayment: number;
  ticketsSent: number;
  checkedIn: number;
  checkInPercentage: number;
  totalRevenue: number;
}
