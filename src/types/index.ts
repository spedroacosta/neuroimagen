export type PaymentStatus = 'pending' | 'verified' | 'rejected';

export interface Participant {
  id: string;
  responseId: string;
  fullName: string;
  email: string;
  phone: string;
  cedula: string;
  registeredAt: string;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  paymentProofFileId: string;
  paymentProofUrl: string;
  rawAnswersJson: string;
  verifiedAt: string;
  verifiedBy: string;
  ticketSentAt: string;
  generatedSlideId: string;
  isCheckedIn: boolean;
  checkedInAt: string;
  checkedInBy: string;
  ownerEmail: string;
  createdAt?: unknown;
  updatedAt?: unknown;
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
}

export interface Stats {
  totalRegistered: number;
  pendingPayment: number;
  verifiedPayment: number;
  ticketsSent: number;
  checkedIn: number;
  checkInPercentage: number;
}
