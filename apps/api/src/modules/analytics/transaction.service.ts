import { neon } from '@neondatabase/serverless';

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

export class TransactionService {
  /**
   * Inserta un nuevo registro en fact_operation (ALP4-005)
   */
  static async insertOperationFact(data: OperationFactInput) {
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
    const sql = getSql();
    const result = await sql`
      INSERT INTO fact_stage_changes (
        id_oportunidad_sk,
        id_fecha_cambio_sk,
        etapa_anterior,
        etapa_nueva,
        dias_en_etapa
      ) VALUES (
        ${data.id_oportunidad_sk},
        ${data.id_fecha_cambio_sk},
        ${data.etapa_anterior},
        ${data.etapa_nueva},
        ${data.dias_en_etapa ?? 0}
      )
      RETURNING id_fact_stage_change_sk;
    `;
    return result[0];
  }

  /**
   * Inserta un nuevo registro en fact_closing (ALP4-005)
   */
  static async insertClosingFact(data: ClosingFactInput) {
    const sql = getSql();
    const result = await sql`
      INSERT INTO fact_closing (
        id_operacion_sk,
        id_vendedor_sk,
        id_cliente_sk,
        id_fecha_cierre_sk,
        monto_cierre,
        tipo_cierre
      ) VALUES (
        ${data.id_operacion_sk},
        ${data.id_vendedor_sk},
        ${data.id_cliente_sk},
        ${data.id_fecha_cierre_sk},
        ${data.monto_cierre},
        ${data.tipo_cierre}
      )
      RETURNING id_fact_closing_sk;
    `;
    return result[0];
  }
}