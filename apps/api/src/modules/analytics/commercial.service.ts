import { neon } from '@neondatabase/serverless';
import { AnalyticsValidation } from './analytics.validation';

const getSql = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada.");
  }
  return neon(connectionString);
};

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

export class CommercialService {
  /**
   * Inserta un nuevo registro en fact_lead (ALP4-004)
   */
  static async insertLeadFact(data: LeadFactInput) {
    AnalyticsValidation.lead(data);

    const sql = getSql();
    const result = await sql`
      INSERT INTO fact_lead (
        id_cliente_sk,
        id_fecha_captacion_sk,
        id_canal_origen_sk,
        id_vendedor_asignado_sk,
        cod_lead_bk,
        estado_lead,
        source_system,
        score_lead
      ) VALUES (
        ${data.id_cliente_sk},
        ${data.id_fecha_captacion_sk},
        ${data.id_canal_origen_sk},
        ${data.id_vendedor_asignado_sk},
        ${data.cod_lead_bk},
        ${data.estado_lead},
        ${data.source_system},
        ${data.score_lead ?? null}
      )
      RETURNING id_fact_lead_sk;
    `;
    return result[0];
  }

  /**
   * Inserta un nuevo registro en fact_visit (ALP4-004)
   */
  static async insertVisitFact(data: VisitFactInput) {
    AnalyticsValidation.visit(data);

    const sql = getSql();
    const result = await sql`
      INSERT INTO fact_visit (
        id_cliente_sk,
        id_vendedor_sk,
        id_ubicacion_sk,
        id_fecha_visita_sk,
        cod_visita_bk,
        tipo_visita,
        resultado_visita,
        duracion_minutos,
        es_primera_visita
      ) VALUES (
        ${data.id_cliente_sk},
        ${data.id_vendedor_sk},
        ${data.id_ubicacion_sk},
        ${data.id_fecha_visita_sk},
        ${data.cod_visita_bk},
        ${data.tipo_visita},
        ${data.resultado_visita},
        ${data.duracion_minutos ?? null},
        ${data.es_primera_visita ?? 0}
      )
      RETURNING id_fact_visit_sk;
    `;
    return result[0];
  }

  /**
   * Inserta un nuevo registro en fact_reservation (ALP4-004)
   */
  static async insertReservationFact(data: ReservationFactInput) {
    AnalyticsValidation.reservation(data);

    const sql = getSql();
    const result = await sql`
      INSERT INTO fact_reservation (
        id_cliente_sk,
        id_vendedor_sk,
        id_producto_sk,
        id_ubicacion_sk,
        id_fecha_reserva_sk,
        cod_reserva_bk,
        estado_reserva,
        monto_reserva,
        dias_vigencia
      ) VALUES (
        ${data.id_cliente_sk},
        ${data.id_vendedor_sk},
        ${data.id_producto_sk},
        ${data.id_ubicacion_sk},
        ${data.id_fecha_reserva_sk},
        ${data.cod_reserva_bk},
        ${data.estado_reserva},
        ${data.monto_reserva},
        ${data.dias_vigencia ?? 0}
      )
      RETURNING id_fact_reservation_sk;
    `;
    return result[0];
  }

  /**
   * Inserta un nuevo registro en fact_opportunity (ALP4-004)
   */
  static async insertOpportunityFact(data: OpportunityFactInput) {
    AnalyticsValidation.opportunity(data);
    
    const sql = getSql();
    const result = await sql`
      INSERT INTO fact_opportunity (
        id_cliente_sk,
        id_vendedor_sk,
        id_producto_sk,
        id_fecha_apertura_sk,
        id_fecha_cierre_estimada_sk,
        cod_oportunidad_bk,
        etapa_crm,
        motivo_perdida,
        monto_oportunidad,
        probabilidad_cierre,
        monto_ponderado,
        dias_en_pipeline
      ) VALUES (
        ${data.id_cliente_sk},
        ${data.id_vendedor_sk},
        ${data.id_producto_sk},
        ${data.id_fecha_apertura_sk},
        ${data.id_fecha_cierre_estimada_sk},
        ${data.cod_oportunidad_bk},
        ${data.etapa_crm},
        ${data.motivo_perdida ?? null},
        ${data.monto_oportunidad},
        ${data.probabilidad_cierre},
        ${data.monto_ponderado},
        ${data.dias_en_pipeline ?? null}
      )
      RETURNING id_fact_opportunity_sk;
    `;
    return result[0];
  }
}