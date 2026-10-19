export interface CreateReservationInput {
  opportunityId: string;
  assetId: string;
  createdBy: string;
  idempotencyKey: string;
  offerThreadId?: string;
  expiresInMinutes?: number;
}

export interface ReservationRecord {
  id: string;
  opportunity_id: string;
  asset_id: string;
  offer_thread_id: string | null;
  idempotency_key: string;
  status: string;
  expires_at: string;
  created_by: string;
  converted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}
