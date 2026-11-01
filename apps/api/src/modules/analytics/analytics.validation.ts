
export class AnalyticsValidationError extends Error {
  public readonly code = "VALIDATION_ERROR";
  public readonly statusCode = 400;

  constructor(public readonly details: string[]) {
    super(details.join("; "));
    this.name = "AnalyticsValidationError";
  }
}

type DataRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validateRecord(data: unknown, required: string[]): DataRecord {
  if (!isRecord(data)) {
    throw new AnalyticsValidationError(["El cuerpo debe ser un objeto JSON."]);
  }

  const errors: string[] = [];

  for (const field of required) {
    const value = data[field];

    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      errors.push(`${field} es obligatorio.`);
    }
  }

  returnWithErrors(errors);
  return data;
}

function returnWithErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new AnalyticsValidationError(errors);
  }
}

function validatePositiveInteger(
  data: DataRecord,
  fields: string[],
): void {
  const errors: string[] = [];

  for (const field of fields) {
    const value = data[field];

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value <= 0
    ) {
      errors.push(`${field} debe ser un entero positivo.`);
    }
  }

  returnWithErrors(errors);
}

function validateDateKeys(
  data: DataRecord,
  fields: string[],
): void {
  const errors: string[] = [];

  for (const field of fields) {
    const value = data[field];

    if (
      typeof value !== "number" ||
      !Number.isInteger(value)
    ) {
      errors.push(`${field} debe tener formato YYYYMMDD.`);
      continue;
    }

    const dateText = String(value);

    if (!/^\d{8}$/.test(dateText)) {
      errors.push(`${field} debe tener formato YYYYMMDD.`);
      continue;
    }

    const year = Number(dateText.slice(0, 4));
    const month = Number(dateText.slice(4, 6));
    const day = Number(dateText.slice(6, 8));

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      errors.push(`${field} no representa una fecha válida.`);
    }
  }

  returnWithErrors(errors);
}

function validateText(
  data: DataRecord,
  fields: string[],
): void {
  const errors = fields
    .filter(
      (field) =>
        typeof data[field] !== "string" ||
        (data[field] as string).trim() === "",
    )
    .map((field) => `${field} debe ser un texto no vacío.`);

  returnWithErrors(errors);
}

function validateNumber(
  data: DataRecord,
  field: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
  } = {},
): void {
  const value = data[field];

  if (value === undefined || value === null) {
    if (options.required) {
      throw new AnalyticsValidationError([`${field} es obligatorio.`]);
    }
    return;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (options.integer && !Number.isInteger(value)) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    throw new AnalyticsValidationError([
      `${field} tiene un valor fuera de las reglas permitidas.`,
    ]);
  }
}

const REQUIRED = {
  lead: [
    "id_cliente_sk",
    "id_fecha_captacion_sk",
    "id_canal_origen_sk",
    "id_vendedor_asignado_sk",
    "cod_lead_bk",
    "estado_lead",
    "source_system",
  ],
  visit: [
    "id_cliente_sk",
    "id_vendedor_sk",
    "id_ubicacion_sk",
    "id_fecha_visita_sk",
    "cod_visita_bk",
    "tipo_visita",
    "resultado_visita",
  ],
  reservation: [
    "id_cliente_sk",
    "id_vendedor_sk",
    "id_producto_sk",
    "id_ubicacion_sk",
    "id_fecha_reserva_sk",
    "cod_reserva_bk",
    "estado_reserva",
    "monto_reserva",
  ],
  opportunity: [
    "id_cliente_sk",
    "id_vendedor_sk",
    "id_producto_sk",
    "id_fecha_apertura_sk",
    "id_fecha_cierre_estimada_sk",
    "cod_oportunidad_bk",
    "etapa_crm",
    "monto_oportunidad",
    "probabilidad_cierre",
    "monto_ponderado",
  ],
  operation: [
    "id_cliente_sk",
    "id_vendedor_sk",
    "id_producto_sk",
    "id_ubicacion_sk",
    "id_fecha_operacion_sk",
    "cod_operacion_bk",
    "tipo_operacion",
    "source_system",
    "monto_bruto",
    "monto_neto_operacion",
  ],
  stageChange: [
    "id_entidad_sk",
    "id_fecha_cambio_sk",
    "cod_transaccion_bk",
    "etapa_nueva",
    "origen_cambio",
  ],
  closing: [
    "id_producto_sk",
    "id_ubicacion_sk",
    "id_fecha_cierre_sk",
    "cod_cierre_bk",
    "estado_cierre",
    "monto_final_cerrado",
  ],
};

export const AnalyticsValidation = {
  lead(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.lead);
    validatePositiveInteger(data, [
      "id_cliente_sk",
      "id_fecha_captacion_sk",
      "id_canal_origen_sk",
      "id_vendedor_asignado_sk",
    ]);
    validateDateKeys(data, ["id_fecha_captacion_sk"]);
    validateText(data, ["cod_lead_bk", "estado_lead", "source_system"]);
    validateNumber(data, "score_lead");
    return data;
  },

  visit(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.visit);
    validatePositiveInteger(data, [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_ubicacion_sk",
      "id_fecha_visita_sk",
    ]);
    validateDateKeys(data, ["id_fecha_visita_sk"]);
    validateText(data, ["cod_visita_bk", "tipo_visita", "resultado_visita"]);
    validateNumber(data, "duracion_minutos", { min: 0 });
    validateNumber(data, "es_primera_visita", {
      min: 0,
      max: 1,
      integer: true,
    });
    return data;
  },

  reservation(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.reservation);
    validatePositiveInteger(data, [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_producto_sk",
      "id_ubicacion_sk",
      "id_fecha_reserva_sk",
    ]);
    validateDateKeys(data, ["id_fecha_reserva_sk"]);
    validateText(data, ["cod_reserva_bk", "estado_reserva"]);
    validateNumber(data, "monto_reserva", { min: 0, required: true });
    validateNumber(data, "dias_vigencia", {
      min: 0,
      integer: true,
    });
    return data;
  },

  opportunity(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.opportunity);
    validatePositiveInteger(data, [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_producto_sk",
      "id_fecha_apertura_sk",
      "id_fecha_cierre_estimada_sk",
    ]);
    validateDateKeys(data, [
      "id_fecha_apertura_sk",
      "id_fecha_cierre_estimada_sk",
    ]);
    validateText(data, ["cod_oportunidad_bk", "etapa_crm"]);
    validateNumber(data, "monto_oportunidad", {
      min: 0,
      required: true,
    });
    validateNumber(data, "probabilidad_cierre", {
      min: 0,
      max: 100,
      required: true,
    });
    validateNumber(data, "monto_ponderado", {
      min: 0,
      required: true,
    });
    validateNumber(data, "dias_en_pipeline", {
      min: 0,
      integer: true,
    });

    const expected =
      (data.monto_oportunidad as number) *
      (data.probabilidad_cierre as number) /
      100;

    if (
      Math.abs(
        (data.monto_ponderado as number) - expected,
      ) > 0.01
    ) {
      throw new AnalyticsValidationError([
        "monto_ponderado no coincide con monto_oportunidad * probabilidad_cierre / 100.",
      ]);
    }

    return data;
  },

  operation(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.operation);
    validatePositiveInteger(data, [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_producto_sk",
      "id_ubicacion_sk",
      "id_fecha_operacion_sk",
    ]);
    validateDateKeys(data, ["id_fecha_operacion_sk"]);
    validateText(data, ["cod_operacion_bk", "tipo_operacion", "source_system"]);

    validateNumber(data, "monto_bruto", {
      min: 0,
      required: true,
    });
    validateNumber(data, "monto_descuento", { min: 0 });
    validateNumber(data, "monto_neto_operacion", {
      min: 0,
      required: true,
    });
    validateNumber(data, "cantidad_unidades", {
      min: 1,
      integer: true,
    });

    const discount = (data.monto_descuento as number | undefined) ?? 0;
    const expected = (data.monto_bruto as number) - discount;

    if (discount > (data.monto_bruto as number)) {
      throw new AnalyticsValidationError([
        "monto_descuento no puede superar monto_bruto.",
      ]);
    }

    if (
      Math.abs(
        (data.monto_neto_operacion as number) - expected,
      ) > 0.01
    ) {
      throw new AnalyticsValidationError([
        "monto_neto_operacion debe ser monto_bruto menos monto_descuento.",
      ]);
    }

    return data;
  },

  stageChange(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.stageChange);
    validatePositiveInteger(data, [
      "id_entidad_sk",
      "id_fecha_cambio_sk",
    ]);
    validateDateKeys(data, ["id_fecha_cambio_sk"]);
    validateText(data, [
      "cod_transaccion_bk",
      "etapa_nueva",
      "origen_cambio",
    ]);
    if (data.etapa_anterior !== undefined && data.etapa_anterior !== null) {
    validateText(data, ["etapa_anterior"]);
    }
    validateNumber(data, "tiempo_permanencia_etapa_anterior_segundos", {
      min: 0,
      integer: true,
    });
    validateNumber(data, "id_vendedor_sk", {
      min: 1,
      integer: true,
    });
    validateNumber(data, "cambio_efectuado", {
      integer: true,
    });
    return data;
  },

  closing(input: unknown): DataRecord {
    const data = validateRecord(input, REQUIRED.closing);
    validatePositiveInteger(data, [
      "id_producto_sk",
      "id_ubicacion_sk",
      "id_fecha_cierre_sk",
    ]);
    validateDateKeys(data, ["id_fecha_cierre_sk"]);
    validateText(data, ["cod_cierre_bk", "estado_cierre"]);
    validateNumber(data, "monto_final_cerrado", {
      min: 0,
      required: true,
    });
    validateNumber(data, "comision_total_generada", { min: 0 });
    validateNumber(data, "costos_asociados", { min: 0 });
    return data;
  },
};
