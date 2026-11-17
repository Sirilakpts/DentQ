export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface DentalService {
  id: string;
  nameTh: string;
  nameEn: string;
  durationMinutes: number;
  priceMin: number;
  priceMax: number;
  priceDisplay: string;
  description: string;
  icon: string;
  isActive: boolean;
}

export interface SlotAvailability {
  time: string;
  period: "MORNING" | "AFTERNOON";
  status: "AVAILABLE" | "FULL" | "BLOCKED";
  currentBookings: number;
  maxCapacity: number;
  blockedReason?: string | null;
}

export interface BookingRecord {
  id: string;
  queueNumber: string;
  date: string;
  time: string;
  period: string;
  serviceId: string;
  service?: DentalService;
  patientName: string;
  phoneNumber: string;
  nationalIdOrHn: string;
  symptoms?: string | null;
  isEmergency: boolean;
  emergencySeverity?: string | null;
  emergencyNotes?: string | null;
  status: BookingStatus;
  rejectReason?: string | null;
  pdpaAccepted: boolean;
  pdpaAcceptedAt: Date | string;
  lineUserId?: string | null;
  lineNotificationSent: boolean;
  reminderSentAt?: Date | string | null;
  reminderStatus?: string | null;
  medicalRights?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ClinicKPIs {
  pendingCount: number;
  confirmedTodayCount: number;
  inProgressCount: number;
  completedTodayCount: number;
  emergencyCount: number;
  totalToday: number;
  procedureCount?: number;
}
