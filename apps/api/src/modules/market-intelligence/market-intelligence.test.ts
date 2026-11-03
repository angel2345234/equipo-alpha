/**
 * ALP5-007 — Market Intelligence Mart Tests
 * Célula Alpha — Zenplus OS — Fase 5: XENIA Intelligence & AI
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  marketIntelligenceService,
  Phase4RawOperationalInput,
} from "./market-intelligence.service";

test("calcula métricas de inventario y ratio de disponibilidad correctamente (M-05)", () => {
  const metrics = marketIntelligenceService.calculateInventoryMetrics(
    10, // total
    7,  // available
    2,  // reserved
    1,  // sold
    [40000, 50000, 60000],
  );

  assert.equal(metrics.totalUnits, 10);
  assert.equal(metrics.availableUnits, 7);
  assert.equal(metrics.availabilityRatio, 70); // 7 / 10 * 100
  assert.equal(metrics.minPriceUsd, 40000);
  assert.equal(metrics.maxPriceUsd, 60000);
  assert.equal(metrics.avgPriceUsd, 50000);
  assert.equal(metrics.totalInventoryValueUsd, 500000); // 50000 * 10
});

test("maneja inventario vacío sin divisiones por cero ni errores de valor", () => {
  const metrics = marketIntelligenceService.calculateInventoryMetrics(0, 0, 0, 0, []);

  assert.equal(metrics.totalUnits, 0);
  assert.equal(metrics.availableUnits, 0);
  assert.equal(metrics.availabilityRatio, 0);
  assert.equal(metrics.avgPriceUsd, 0);
  assert.equal(metrics.totalInventoryValueUsd, 0);
});

test("calcula demanda y tasa de conversión lead-a-reserva (M-01 y M-02)", () => {
  const metrics = marketIntelligenceService.calculateDemandMetrics(
    50, // leads
    20, // visits
    15, // opportunities
    [100000, 200000],
    [50, 25], // 50% y 25% probabilidad
    5,  // reservations
  );

  assert.equal(metrics.leadsCaptured, 50);
  assert.equal(metrics.reservationsCount, 5);
  assert.equal(metrics.leadToReservationConversionRate, 10); // 5 / 50 * 100
  // Ponderado: (100000 * 0.5) + (200000 * 0.25) = 50000 + 50000 = 100000
  assert.equal(metrics.weightedPipelineAmountUsd, 100000);
});

test("calcula métricas de desempeño comercial y tiempo de ciclo (M-03 y M-04)", () => {
  const metrics = marketIntelligenceService.calculatePerformanceMetrics(
    75000, // active reservations amount
    3,     // closed operations
    [80000, 120000, 150000],
    [15, 25, 20], // cycle times in days
  );

  assert.equal(metrics.activeReservationsAmountUsd, 75000);
  assert.equal(metrics.closedOperationsCount, 3);
  assert.equal(metrics.closedOperationsAmountUsd, 350000);
  assert.equal(metrics.avgCycleTimeDays, 20); // (15 + 25 + 20) / 3 = 20
});

test("reconcilia datos de Fase 4 generando hash de linaje SHA-256 y metadata de gobernanza", () => {
  const input: Phase4RawOperationalInput = {
    zone: "Zona Norte",
    department: "Lima",
    province: "Lima",
    district: "Carabayllo",
    projectName: "Los Álamos",
    periodMonth: "2026-10",
    totalUnits: 20,
    availableUnits: 14,
    reservedUnits: 4,
    soldUnits: 2,
    unitPricesUsd: [45000, 48000],
    leadsCaptured: 100,
    qualifiedVisits: 35,
    activeOpportunities: 25,
    opportunityAmountsUsd: [90000],
    opportunityProbabilities: [50],
    reservationsCount: 10,
    activeReservationsAmountUsd: 150000,
    closedOperationsCount: 2,
    closedOperationsAmountsUsd: [95000, 95000],
    cycleTimesDays: [18, 22],
  };

  const fixedDate = "2026-10-31T23:59:59.000Z";
  const record = marketIntelligenceService.reconcileAndConsolidateRecord(input, fixedDate);

  assert.ok(record.id);
  assert.equal(record.dimensions.zone, "Zona Norte");
  assert.equal(record.dimensions.projectName, "Los Álamos");
  assert.equal(record.dimensions.periodMonth, "2026-10");
  assert.equal(record.inventory.availabilityRatio, 70); // 14 / 20 * 100
  assert.equal(record.demand.leadToReservationConversionRate, 10); // 10 / 100 * 100
  assert.equal(record.performance.avgCycleTimeDays, 20);

  // Verificación de gobernanza y procedencia
  assert.equal(record.governance.reconciledWithPhase4, true);
  assert.equal(record.governance.classification, "INTERNAL");
  assert.equal(record.governance.dataFreshnessAt, fixedDate);
  assert.deepEqual(record.governance.sourceSystems, ["CRM", "INVENTORY", "CORE"]);
  assert.match(record.governance.lineageHash, /^[0-9a-f]{64}$/);
});

test("filtra registros del Mart por dimensiones y genera resumen consolidado", () => {
  const inputNorte: Phase4RawOperationalInput = {
    zone: "Zona Norte",
    department: "Lima",
    province: "Lima",
    district: "Carabayllo",
    projectName: "Los Álamos",
    periodMonth: "2026-10",
    totalUnits: 10,
    availableUnits: 6,
    reservedUnits: 2,
    soldUnits: 2,
    unitPricesUsd: [45000],
    leadsCaptured: 40,
    qualifiedVisits: 10,
    activeOpportunities: 8,
    opportunityAmountsUsd: [50000],
    opportunityProbabilities: [40],
    reservationsCount: 4,
    activeReservationsAmountUsd: 50000,
    closedOperationsCount: 1,
    closedOperationsAmountsUsd: [45000],
    cycleTimesDays: [14],
  };

  const inputSur: Phase4RawOperationalInput = {
    zone: "Zona Sur",
    department: "Lima",
    province: "Cañete",
    district: "Chilca",
    projectName: "Costa Azul",
    periodMonth: "2026-10",
    totalUnits: 15,
    availableUnits: 9,
    reservedUnits: 3,
    soldUnits: 3,
    unitPricesUsd: [35000],
    leadsCaptured: 60,
    qualifiedVisits: 20,
    activeOpportunities: 12,
    opportunityAmountsUsd: [70000],
    opportunityProbabilities: [50],
    reservationsCount: 6,
    activeReservationsAmountUsd: 70000,
    closedOperationsCount: 2,
    closedOperationsAmountsUsd: [70000],
    cycleTimesDays: [20],
  };

  const recordNorte = marketIntelligenceService.reconcileAndConsolidateRecord(inputNorte);
  const recordSur = marketIntelligenceService.reconcileAndConsolidateRecord(inputSur);

  const dataset = [recordNorte, recordSur];

  // Filtro por Zona
  const filteredNorte = marketIntelligenceService.filterRecords(dataset, { zone: "Zona Norte" });
  assert.equal(filteredNorte.length, 1);
  assert.equal(filteredNorte[0]?.dimensions.projectName, "Los Álamos");

  // Resumen ejecutivo
  const summary = marketIntelligenceService.generateSummary(dataset, "2026-10");
  assert.equal(summary.totalZonesCovered, 2);
  assert.equal(summary.totalProjectsCovered, 2);
  assert.equal(summary.totalUnitsAvailable, 15); // 6 + 9
  assert.equal(summary.overallConversionRate, 10); // (4 + 6) / (40 + 60) * 100 = 10%
  assert.equal(summary.totalClosedVolumeUsd, 115000); // 45000 + 70000
});
