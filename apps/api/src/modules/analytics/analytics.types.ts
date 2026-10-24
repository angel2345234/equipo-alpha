// Tipos y Modelos para la Capa Analítica (Fase 4 - Célula Alpha)

export interface DimDate {
  date_key: number;
  full_date: string;
  year: number;
  quarter: number;
  quarter_name: string;
  month: number;
  month_name: string;
  month_year: string;
  week_of_year: number;
  day_of_month: number;
  day_of_week: number;
  day_name: string;
  is_weekend: boolean;
  is_holiday_pe: boolean;
}

export interface DimGeography {
  geography_key?: number;
  country: string;
  department: string;
  province: string;
  district: string;
  zone?: string;
  market_tier?: string;
}

export interface DimAdvisor {
  advisor_key?: number;
  advisor_id: string; // Natural key (core.parties.id / assigned_to)
  full_name: string;
  email_masked?: string;
  team?: string;
  status: string;
  is_active: boolean;
}

export interface DimSource {
  source_key?: number;
  source_code: string;
  source_name: string;
  channel_category: string;
  is_paid: boolean;
}

export interface DimAsset {
  asset_key?: number;
  asset_id: string; // Natural key (inventory.assets.id)
  asset_code: string;
  title: string;
  project_name?: string;
  asset_type: string;
  current_status: string;
  base_price_usd: number;
  area_m2: number;
  currency: string;
  geography_key?: number;
}

export interface MetricContract {
  code: string;
  name: string;
  purpose: string;
  formula: string;
  grain: string;
  sourceTable: string;
  timezone: string;
  filters: string[];
  exclusions: string[];
  sensitivity: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  owner: string;
  freshness: string;
}
