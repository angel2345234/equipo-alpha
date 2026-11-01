
import { neon } from '@neondatabase/serverless';
import { AnalyticsValidation } from './analytics.validation';

const getSql = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada.");
  }
  return neon(connectionString);
};

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
  id_entidad_sk: number;
  id_vendedor_sk?: number | null;
  id_fecha_cambio_sk: number;
  cod_transaccion_bk: string;
  etapa_anterior?: string | null;
  etapa_nueva: string;
  origen_cambio: string;
  tiempo_permanencia_etapa_anterior_segundos?: number | null;
  cambio_efectuado?: number | null;
}

export interface ClosingFactInput {
  id_producto_sk: number;
  id_ubicacion_sk: number;
  id_fecha_cierre_sk: number;
  cod_cierre_bk: string;
  estado_cierre: string;
  monto_final_cerrado: number;
  comision_total_generada?: number | null;
  costos_asociados?: number | null;
}

export class TransactionService {

  /**
   * Inserta un nuevo registro en fact_operation (ALP4-005)
   */
  static async insertOperationFact(data: OperationFactInput) {
    AnalyticsValidation.operation(data);

    const sql = getSql();

    const result = await sql`
      INSERT INTO fact_operation (
        id_cliente_sk,
        id_vendedor_sk,
        id_producto_sk,
        id_ubicacion_sk,
        id_fecha_operacion_sk,
        cod_operacion_bk,
        tipo_operacion,
        source_system,
        monto_bruto,
        monto_descuento,
        monto_neto_operacion,
        cantidad_unidades
      ) VALUES (
        ${data.id_cliente_sk},
        ${data.id_vendedor_sk},
        ${data.id_producto_sk},
        ${data.id_ubicacion_sk},
        ${data.id_fecha_operacion_sk},
        ${data.cod_operacion_bk},
        ${data.tipo_operacion},
        ${data.source_system},
        ${data.monto_bruto},
        ${data.monto_descuento ?? 0},
        ${data.monto_neto_operacion},
        ${data.cantidad_unidades ?? 1}
      )
      RETURNING id_fact_operation_sk;
    `;

    return result[0];
  }

  /**
   * Inserta un nuevo registro en fact_stage_changes (ALP4-005)
   */
  static async insertStageChangeFact(data: StageChangeFactInput) {
    AnalyticsValidation.stageChange(data);

    const sql = getSql();

    const result = await sql`
      INSERT INTO fact_stage_changes (
        id_entidad_sk,
        id_vendedor_sk,
        id_fecha_cambio_sk,
        cod_transaccion_bk,
        etapa_anterior,
        etapa_nueva,
        origen_cambio,
        tiempo_permanencia_etapa_anterior_segundos,
        cambio_efectuado
      ) VALUES (
        ${data.id_entidad_sk},
        ${data.id_vendedor_sk ?? null},
        ${data.id_fecha_cambio_sk},
        ${data.cod_transaccion_bk},
        ${data.etapa_anterior ?? null},
        ${data.etapa_nueva},
        ${data.origen_cambio},
        ${data.tiempo_permanencia_etapa_anterior_segundos ?? null},
        ${data.cambio_efectuado ?? 1}
      )
      RETURNING id_fact_stage_change_sk;
    `;

    return result[0];
  }

  /**
   * Inserta un nuevo registro en fact_closing (ALP4-005)
   */
  static async insertClosingFact(data: ClosingFactInput) {
    AnalyticsValidation.closing(data);

    const sql = getSql();

    const result = await sql`
      INSERT INTO fact_closing (
        id_producto_sk,
        id_ubicacion_sk,
        id_fecha_cierre_sk,
        cod_cierre_bk,
        estado_cierre,
        monto_final_cerrado,
        comision_total_generada,
        costos_asociados
      ) VALUES (
        ${data.id_producto_sk},
        ${data.id_ubicacion_sk},
        ${data.id_fecha_cierre_sk},
        ${data.cod_cierre_bk},
        ${data.estado_cierre},
        ${data.monto_final_cerrado},
        ${data.comision_total_generada ?? 0},
        ${data.costos_asociados ?? 0}
      )
      RETURNING id_fact_closing_sk;
    `;

    return result[0];
  }
}