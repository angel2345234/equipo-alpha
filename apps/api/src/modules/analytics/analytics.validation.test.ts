
import test from "node:test";
import assert from "node:assert/strict";
import {
  AnalyticsValidation,
  AnalyticsValidationError,
} from "./analytics.validation";

const validLead = {
  id_cliente_sk: 101,
  id_fecha_captacion_sk: 20261024,
  id_canal_origen_sk: 2,
  id_vendedor_asignado_sk: 12,
  cod_lead_bk: "LD-2026-001",
  estado_lead: "NUEVO",
  source_system: "CRM",
};

const validVisit = {
  id_cliente_sk: 101,
  id_vendedor_sk: 12,
  id_ubicacion_sk: 3,
  id_fecha_visita_sk: 20261024,
  cod_visita_bk: "VIS-2026-001",
  tipo_visita: "PRESENCIAL",
  resultado_visita: "EXITOSA",
};

const validReservation = {
  id_cliente_sk: 101,
  id_vendedor_sk: 12,
  id_producto_sk: 501,
  id_ubicacion_sk: 3,
  id_fecha_reserva_sk: 20261024,
  cod_reserva_bk: "RES-2026-001",
  estado_reserva: "ACTIVA",
  monto_reserva: 1000,
};

const validOpportunity = {
  id_cliente_sk: 101,
  id_vendedor_sk: 12,
  id_producto_sk: 501,
  id_fecha_apertura_sk: 20261024,
  id_fecha_cierre_estimada_sk: 20261130,
  cod_oportunidad_bk: "OPP-2026-001",
  etapa_crm: "NEGOCIACION",
  monto_oportunidad: 25000,
  probabilidad_cierre: 75,
  monto_ponderado: 18750,
};

const validOperation = {
  id_cliente_sk: 101,
  id_vendedor_sk: 12,
  id_producto_sk: 501,
  id_ubicacion_sk: 3,
  id_fecha_operacion_sk: 20261024,
  cod_operacion_bk: "OP-2026-001",
  tipo_operacion: "VENTA",
  source_system: "ERP_VENTAS",
  monto_bruto: 25000,
  monto_descuento: 1000,
  monto_neto_operacion: 24000,
  cantidad_unidades: 1,
};

const validStageChange = {
  id_entidad_sk: 1,
  id_fecha_cambio_sk: 20261024,
  cod_transaccion_bk: "TRX-001",
  etapa_nueva: "NEGOCIACION",
  origen_cambio: "CRM",
};

const validClosing = {
  id_producto_sk: 501,
  id_ubicacion_sk: 3,
  id_fecha_cierre_sk: 20261024,
  cod_cierre_bk: "CIE-001",
  estado_cierre: "CERRADO",
  monto_final_cerrado: 24000,
};

test("acepta registros válidos de los siete hechos analíticos", () => {
  assert.doesNotThrow(() => AnalyticsValidation.lead(validLead));
  assert.doesNotThrow(() => AnalyticsValidation.visit(validVisit));
  assert.doesNotThrow(() => AnalyticsValidation.reservation(validReservation));
  assert.doesNotThrow(() => AnalyticsValidation.opportunity(validOpportunity));
  assert.doesNotThrow(() => AnalyticsValidation.operation(validOperation));
  assert.doesNotThrow(() => AnalyticsValidation.stageChange(validStageChange));
  assert.doesNotThrow(() => AnalyticsValidation.closing(validClosing));
});

test("rechaza cuerpos que no son objetos", () => {
  assert.throws(
    () => AnalyticsValidation.lead(null),
    AnalyticsValidationError,
  );

  assert.throws(
    () => AnalyticsValidation.lead([]),
    AnalyticsValidationError,
  );
});

test("rechaza campos obligatorios vacíos", () => {
  assert.throws(
    () => AnalyticsValidation.lead({
      ...validLead,
      cod_lead_bk: " ",
    }),
    /cod_lead_bk/,
  );
});

test("rechaza fechas inexistentes o mal formadas", () => {
  assert.throws(
    () => AnalyticsValidation.visit({
      ...validVisit,
      id_fecha_visita_sk: 20260230,
    }),
    /fecha válida/,
  );

  assert.throws(
    () => AnalyticsValidation.lead({
      ...validLead,
      id_fecha_captacion_sk: 2026,
    }),
    /YYYYMMDD/,
  );
});

test("rechaza claves dimensionales no positivas", () => {
  assert.throws(
    () => AnalyticsValidation.lead({
      ...validLead,
      id_cliente_sk: 0,
    }),
    /entero positivo/,
  );
});

test("rechaza duración negativa en visitas", () => {
  assert.throws(
    () => AnalyticsValidation.visit({
      ...validVisit,
      duracion_minutos: -1,
    }),
    /duracion_minutos/,
  );
});

test("acepta solamente 0 o 1 para es_primera_visita", () => {
  assert.doesNotThrow(() =>
    AnalyticsValidation.visit({
      ...validVisit,
      es_primera_visita: 1,
    }),
  );

  assert.throws(
    () => AnalyticsValidation.visit({
      ...validVisit,
      es_primera_visita: 2,
    }),
    /es_primera_visita/,
  );
});

test("rechaza montos negativos en reservas", () => {
  assert.throws(
    () => AnalyticsValidation.reservation({
      ...validReservation,
      monto_reserva: -100,
    }),
    /monto_reserva/,
  );
});

test("rechaza probabilidades fuera del rango de 0 a 100", () => {
  assert.throws(
    () => AnalyticsValidation.opportunity({
      ...validOpportunity,
      probabilidad_cierre: 101,
    }),
    /probabilidad_cierre/,
  );
});

test("rechaza monto ponderado inconsistente", () => {
  assert.throws(
    () => AnalyticsValidation.opportunity({
      ...validOpportunity,
      monto_ponderado: 20000,
    }),
    /monto_ponderado/,
  );
});

test("rechaza descuento superior al monto bruto", () => {
  assert.throws(
    () => AnalyticsValidation.operation({
      ...validOperation,
      monto_descuento: 26000,
    }),
    /monto_descuento/,
  );
});

test("rechaza monto neto inconsistente", () => {
  assert.throws(
    () => AnalyticsValidation.operation({
      ...validOperation,
      monto_neto_operacion: 23000,
    }),
    /monto_neto_operacion/,
  );
});

test("acepta etapa anterior nula en cambios de etapa", () => {
  assert.doesNotThrow(() =>
    AnalyticsValidation.stageChange({
      ...validStageChange,
      etapa_anterior: null,
    }),
  );
});

test("rechaza permanencia negativa en cambios de etapa", () => {
  assert.throws(
    () => AnalyticsValidation.stageChange({
      ...validStageChange,
      tiempo_permanencia_etapa_anterior_segundos: -10,
    }),
    /tiempo_permanencia/,
  );
});

test("rechaza importes negativos en cierres", () => {
  assert.throws(
    () => AnalyticsValidation.closing({
      ...validClosing,
      costos_asociados: -50,
    }),
    /costos_asociados/,
  );
});

test("los errores de validación tienen código y estado HTTP 400", () => {
  try {
    AnalyticsValidation.lead({
      ...validLead,
      cod_lead_bk: "",
    });
    assert.fail("Debió producir un error de validación");
  } catch (error) {
    assert.ok(error instanceof AnalyticsValidationError);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.equal(error.statusCode, 400);
  }
});
