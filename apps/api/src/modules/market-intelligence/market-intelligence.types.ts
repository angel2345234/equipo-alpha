/**
 * ALP5-007 — Market Intelligence Mart Types & Contracts
 * Célula Alpha — Zenplus OS — Fase 5: XENIA Intelligence & AI
 */

export interface MarketMartDimensions {
  zone: string;
  department: string;
  province: string;
  district: string;
  projectName: string;
  periodMonth: string; // YYYY-MM
}

export interface MarketMartInventoryMetrics {
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  availabilityRatio: number; // Porcentaje 0 - 100 (Métrica M-05)
  avgPriceUsd: number;
  minPriceUsd: number;
  maxPriceUsd: number;
  totalInventoryValueUsd: number;
}

export interface MarketMartDemandMetrics {
  leadsCaptured: number; // Métrica M-01
  qualifiedVisits: number;
  activeOpportunities: number;
  weightedPipelineAmountUsd: number;
  reservationsCount: number;
  leadToReservationConversionRate: number; // Porcentaje 0 - 100 (Métrica M-02)
}

export interface MarketMartPerformanceMetrics {
  activeReservationsAmountUsd: number; // Métrica M-03
  closedOperationsCount: number;
  closedOperationsAmountUsd: number;
  avgCycleTimeDays: number; // Métrica M-04
}

export interface MarketMartGovernanceMetadata {
  sourceSystems: string[]; // ['CRM', 'INVENTORY', 'CORE']
  reconciledWithPhase4: boolean;
  dataFreshnessAt: string; // ISO 8601
  lineageHash: string; // SHA-256
  classification: "INTERNAL" | "CONFIDENTIAL";
}

export interface MarketIntelligenceRecord {
  id: string; // Hash unívoco o UUID
  dimensions: MarketMartDimensions;
  inventory: MarketMartInventoryMetrics;
  demand: MarketMartDemandMetrics;
  performance: MarketMartPerformanceMetrics;
  governance: MarketMartGovernanceMetadata;
}

export interface MarketIntelligenceFilter {
  zone?: string;
  district?: string;
  projectName?: string;
  periodMonth?: string;
}

export interface MarketIntelligenceSummary {
  periodMonth: string;
  totalZonesCovered: number;
  totalProjectsCovered: number;
  totalUnitsAvailable: number;
  totalInventoryValuationUsd: number;
  overallConversionRate: number;
  totalClosedVolumeUsd: number;
  generatedAt: string;
}
