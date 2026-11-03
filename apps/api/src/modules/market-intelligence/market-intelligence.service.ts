/**
 * ALP5-007 — Market Intelligence Mart Service
 * Célula Alpha — Zenplus OS — Fase 5: XENIA Intelligence & AI
 */

import { createHash } from "node:crypto";
import {
  MarketIntelligenceFilter,
  MarketIntelligenceRecord,
  MarketIntelligenceSummary,
  MarketMartDimensions,
  MarketMartInventoryMetrics,
  MarketMartDemandMetrics,
  MarketMartPerformanceMetrics,
  MarketMartGovernanceMetadata,
} from "./market-intelligence.types";

export interface Phase4RawOperationalInput {
  zone: string;
  department: string;
  province: string;
  district: string;
  projectName: string;
  periodMonth: string;
  // Inventario
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  unitPricesUsd: number[];
  // Demanda
  leadsCaptured: number;
  qualifiedVisits: number;
  activeOpportunities: number;
  opportunityAmountsUsd: number[];
  opportunityProbabilities: number[];
  reservationsCount: number;
  // Desempeño
  activeReservationsAmountUsd: number;
  closedOperationsCount: number;
  closedOperationsAmountsUsd: number[];
  cycleTimesDays: number[];
}

export class MarketIntelligenceService {
  /**
   * Calcula el hash determinista de linaje (SHA-256) para trazabilidad.
   */
  public computeLineageHash(
    dimensions: MarketMartDimensions,
    sourceSystems: string[],
    freshnessAt: string,
  ): string {
    const raw = `${dimensions.zone}|${dimensions.projectName}|${dimensions.periodMonth}|${[...sourceSystems].sort().join(",")}|${freshnessAt}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Calcula las métricas de inventario asegurando consistencia y evitando división por cero.
   */
  public calculateInventoryMetrics(
    totalUnits: number,
    availableUnits: number,
    reservedUnits: number,
    soldUnits: number,
    pricesUsd: number[],
  ): MarketMartInventoryMetrics {
    const safeTotal = Math.max(0, totalUnits);
    const safeAvailable = Math.max(0, Math.min(availableUnits, safeTotal));
    const safeReserved = Math.max(0, reservedUnits);
    const safeSold = Math.max(0, soldUnits);

    const availabilityRatio =
      safeTotal > 0
        ? Number(((safeAvailable / safeTotal) * 100).toFixed(2))
        : 0;

    let minPriceUsd = 0;
    let maxPriceUsd = 0;
    let avgPriceUsd = 0;
    let totalInventoryValueUsd = 0;

    if (pricesUsd.length > 0) {
      const positivePrices = pricesUsd.filter((p) => p > 0);
      if (positivePrices.length > 0) {
        minPriceUsd = Math.min(...positivePrices);
        maxPriceUsd = Math.max(...positivePrices);
        const sum = positivePrices.reduce((acc, p) => acc + p, 0);
        avgPriceUsd = Number((sum / positivePrices.length).toFixed(2));
        totalInventoryValueUsd = Number((avgPriceUsd * safeTotal).toFixed(2));
      }
    }

    return {
      totalUnits: safeTotal,
      availableUnits: safeAvailable,
      reservedUnits: safeReserved,
      soldUnits: safeSold,
      availabilityRatio,
      avgPriceUsd,
      minPriceUsd,
      maxPriceUsd,
      totalInventoryValueUsd,
    };
  }

  /**
   * Calcula las métricas de demanda y conversión conforme a los estándares de Fase 4 (M-01 y M-02).
   */
  public calculateDemandMetrics(
    leadsCaptured: number,
    qualifiedVisits: number,
    activeOpportunities: number,
    opportunityAmountsUsd: number[],
    opportunityProbabilities: number[],
    reservationsCount: number,
  ): MarketMartDemandMetrics {
    const safeLeads = Math.max(0, leadsCaptured);
    const safeReservations = Math.max(0, reservationsCount);

    const leadToReservationConversionRate =
      safeLeads > 0
        ? Number(((safeReservations / safeLeads) * 100).toFixed(2))
        : 0;

    let weightedPipelineAmountUsd = 0;
    for (let i = 0; i < opportunityAmountsUsd.length; i++) {
      const amt = opportunityAmountsUsd[i] ?? 0;
      const prob = (opportunityProbabilities[i] ?? 0) / 100;
      weightedPipelineAmountUsd += amt * prob;
    }
    weightedPipelineAmountUsd = Number(weightedPipelineAmountUsd.toFixed(2));

    return {
      leadsCaptured: safeLeads,
      qualifiedVisits: Math.max(0, qualifiedVisits),
      activeOpportunities: Math.max(0, activeOpportunities),
      weightedPipelineAmountUsd,
      reservationsCount: safeReservations,
      leadToReservationConversionRate,
    };
  }

  /**
   * Calcula las métricas de desempeño y tiempos de ciclo conforme a Fase 4 (M-03 y M-04).
   */
  public calculatePerformanceMetrics(
    activeReservationsAmountUsd: number,
    closedOperationsCount: number,
    closedOperationsAmountsUsd: number[],
    cycleTimesDays: number[],
  ): MarketMartPerformanceMetrics {
    const safeClosedCount = Math.max(0, closedOperationsCount);
    const closedOperationsAmountUsd = closedOperationsAmountsUsd.reduce(
      (acc, v) => acc + (v > 0 ? v : 0),
      0,
    );

    let avgCycleTimeDays = 0;
    if (cycleTimesDays.length > 0) {
      const sum = cycleTimesDays.reduce((acc, d) => acc + Math.max(0, d), 0);
      avgCycleTimeDays = Number((sum / cycleTimesDays.length).toFixed(1));
    }

    return {
      activeReservationsAmountUsd: Math.max(0, activeReservationsAmountUsd),
      closedOperationsCount: safeClosedCount,
      closedOperationsAmountUsd: Number(closedOperationsAmountUsd.toFixed(2)),
      avgCycleTimeDays,
    };
  }

  /**
   * Transforma y reconcilia datos operacionales de Fase 4 en un registro oficial del Market Mart.
   */
  public reconcileAndConsolidateRecord(
    input: Phase4RawOperationalInput,
    freshnessDate = new Date().toISOString(),
  ): MarketIntelligenceRecord {
    const dimensions: MarketMartDimensions = {
      zone: input.zone.trim(),
      department: input.department.trim(),
      province: input.province.trim(),
      district: input.district.trim(),
      projectName: input.projectName.trim(),
      periodMonth: input.periodMonth.trim(),
    };

    const inventory = this.calculateInventoryMetrics(
      input.totalUnits,
      input.availableUnits,
      input.reservedUnits,
      input.soldUnits,
      input.unitPricesUsd,
    );

    const demand = this.calculateDemandMetrics(
      input.leadsCaptured,
      input.qualifiedVisits,
      input.activeOpportunities,
      input.opportunityAmountsUsd,
      input.opportunityProbabilities,
      input.reservationsCount,
    );

    const performance = this.calculatePerformanceMetrics(
      input.activeReservationsAmountUsd,
      input.closedOperationsCount,
      input.closedOperationsAmountsUsd,
      input.cycleTimesDays,
    );

    const sourceSystems = ["CRM", "INVENTORY", "CORE"];
    const lineageHash = this.computeLineageHash(
      dimensions,
      sourceSystems,
      freshnessDate,
    );

    const governance: MarketMartGovernanceMetadata = {
      sourceSystems,
      reconciledWithPhase4: true,
      dataFreshnessAt: freshnessDate,
      lineageHash,
      classification: "INTERNAL",
    };

    const id = createHash("md5")
      .update(`${dimensions.zone}:${dimensions.projectName}:${dimensions.periodMonth}`)
      .digest("hex");

    return {
      id,
      dimensions,
      inventory,
      demand,
      performance,
      governance,
    };
  }

  /**
   * Filtra registros del Mart por criterios dimensionales (Zona, Proyecto, Periodo).
   */
  public filterRecords(
    records: MarketIntelligenceRecord[],
    filter: MarketIntelligenceFilter,
  ): MarketIntelligenceRecord[] {
    return records.filter((r) => {
      if (filter.zone && r.dimensions.zone.toLowerCase() !== filter.zone.toLowerCase()) {
        return false;
      }
      if (filter.district && r.dimensions.district.toLowerCase() !== filter.district.toLowerCase()) {
        return false;
      }
      if (
        filter.projectName &&
        r.dimensions.projectName.toLowerCase() !== filter.projectName.toLowerCase()
      ) {
        return false;
      }
      if (filter.periodMonth && r.dimensions.periodMonth !== filter.periodMonth) {
        return false;
      }
      return true;
    });
  }

  /**
   * Genera el resumen ejecutivo del Market Intelligence Mart para un periodo dado.
   */
  public generateSummary(
    records: MarketIntelligenceRecord[],
    periodMonth: string,
  ): MarketIntelligenceSummary {
    const periodRecords = records.filter(
      (r) => r.dimensions.periodMonth === periodMonth,
    );

    const uniqueZones = new Set(periodRecords.map((r) => r.dimensions.zone));
    const uniqueProjects = new Set(periodRecords.map((r) => r.dimensions.projectName));

    let totalUnitsAvailable = 0;
    let totalInventoryValuationUsd = 0;
    let totalLeads = 0;
    let totalReservations = 0;
    let totalClosedVolumeUsd = 0;

    for (const r of periodRecords) {
      totalUnitsAvailable += r.inventory.availableUnits;
      totalInventoryValuationUsd += r.inventory.totalInventoryValueUsd;
      totalLeads += r.demand.leadsCaptured;
      totalReservations += r.demand.reservationsCount;
      totalClosedVolumeUsd += r.performance.closedOperationsAmountUsd;
    }

    const overallConversionRate =
      totalLeads > 0
        ? Number(((totalReservations / totalLeads) * 100).toFixed(2))
        : 0;

    return {
      periodMonth,
      totalZonesCovered: uniqueZones.size,
      totalProjectsCovered: uniqueProjects.size,
      totalUnitsAvailable,
      totalInventoryValuationUsd: Number(totalInventoryValuationUsd.toFixed(2)),
      overallConversionRate,
      totalClosedVolumeUsd: Number(totalClosedVolumeUsd.toFixed(2)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();
