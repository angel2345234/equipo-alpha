export type AssetStatus = "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export interface UpdateAssetStatusInput {
  status: AssetStatus;
  leadId?: string;
  notes?: string;
}

export const VALID_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  DRAFT: ["AVAILABLE"],
  AVAILABLE: ["RESERVED", "BLOCKED"],
  RESERVED: ["AVAILABLE", "SOLD"],
  BLOCKED: ["AVAILABLE"],
  SOLD: [],
};

export interface AssetFilterParams {
  type?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface CreateAssetDraftInput {
  code: string;
  title: string;
  type: string;
  price: number;
  currency?: string;
  area: number;
  projectId?: string;
  details?: Record<string, any>;
}