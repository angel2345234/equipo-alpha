// ==========================================
// ALP4-004: Commercial Facts Interfaces
// ==========================================

export interface LeadFactInput {
  id_cliente_sk: number;
  id_fecha_captacion_sk: number;
  id_canal_origen_sk: number;
  id_vendedor_asignado_sk: number;
  cod_lead_bk: string;
  estado_lead: string;
  source_system: string;
  score_lead?: number;
}

export interface VisitFactInput {
  id_cliente_sk: number;
  id_vendedor_sk: number;
  id_ubicacion_sk: number;
  id_fecha_visita_sk: number;
  cod_visita_bk: string;
  tipo_visita: string;
  resultado_visita: string;
  duracion_minutos?: number;
  es_primera_visita?: number;
}

export interface ReservationFactInput {
  id_cliente_sk: number;
  id_vendedor_sk: number;
  id_producto_sk: number;
  id_ubicacion_sk: number;
  id_fecha_reserva_sk: number;
  cod_reserva_bk: string;
  estado_reserva: string;
  monto_reserva: number;
  dias_vigencia?: number;
}

export interface OpportunityFactInput {
  id_cliente_sk: number;
  id_vendedor_sk: number;
  id_producto_sk: number;
  id_fecha_apertura_sk: number;
  id_fecha_cierre_estimada_sk: number;
  cod_oportunidad_bk: string;
  etapa_crm: string;
  motivo_perdida?: string;
  monto_oportunidad: number;
  probabilidad_cierre: number;
  monto_ponderado: number;
  dias_en_pipeline?: number;
}

// ==========================================
// ALP4-005: Transaction Facts Interfaces
// ==========================================

export interface OperationFactInput {
  id_cliente_sk: number;
  id_vendedor_sk: number;
  id_producto_sk: number;
  id_ubicacion_sk: number;
  id_fecha_operacion_sk: number;
  cod_operacion_bk: string;
  tipo_operacion: string;
  source_system: string;
  monto_bruto: number;
  monto_descuento?: number;
  monto_neto_operacion: number;
  cantidad_unidades?: number;
}

export interface StageChangeFactInput {
  id_oportunidad_sk: number;
  id_fecha_cambio_sk: number;
  etapa_anterior: string;
  etapa_nueva: string;
  dias_en_etapa?: number;
}

export interface ClosingFactInput {
  id_operacion_sk: number;
  id_vendedor_sk: number;
  id_cliente_sk: number;
  id_fecha_cierre_sk: number;
  monto_cierre: number;
  tipo_cierre: string;
}