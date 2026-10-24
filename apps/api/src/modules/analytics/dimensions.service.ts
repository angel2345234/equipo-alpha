import { pool } from "../../db";

export class DimensionsService {
  /**
   * Enmascara correos para cumplimiento de PII-Safe Analytics (Sección 07 de la Guía)
   */
  static maskEmail(email: string | null | undefined): string {
    if (!email || !email.includes("@")) return "masked@zenplus.pe";
    const [local, domain] = email.split("@");
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }

  /**
   * Genera y puebla el calendario en analytics.dim_date (2024 a 2030)
   */
  static async populateDateDimension(startYear = 2024, endYear = 2030) {
    const client = await pool.connect();
    try {
      console.log(`[DIMENSIONS] Poblando dim_date para el rango ${startYear} - ${endYear}...`);
      await client.query("BEGIN");

      // Días festivos fijos de Perú (mes-día)
      const peruHolidays = new Set([
        "01-01", // Año Nuevo
        "05-01", // Día del Trabajo
        "06-29", // San Pedro y San Pablo
        "07-28", // Fiestas Patrias
        "07-29", // Fiestas Patrias
        "08-06", // Batalla de Junín
        "08-30", // Santa Rosa de Lima
        "10-08", // Combate de Angamos
        "11-01", // Todos los Santos
        "12-08", // Inmaculada Concepción
        "12-09", // Batalla de Ayacucho
        "12-25", // Navidad
      ]);

      const monthNamesEs = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
      ];

      const dayNamesEs = [
        "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
      ];

      const startDate = new Date(startYear, 0, 1);
      const endDate = new Date(endYear, 11, 31);
      const currentDate = new Date(startDate);

      const batchSize = 500;
      let batch: any[] = [];
      let totalInserted = 0;

      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // 1-12
        const day = currentDate.getDate();

        const dateKey = year * 10000 + month * 100 + day;
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const quarter = Math.ceil(month / 3);
        const quarterName = `Q${quarter}-${year}`;
        const monthName = monthNamesEs[month - 1];
        const monthYear = `${year}-${String(month).padStart(2, "0")}`;

        // ISO Week
        const target = new Date(currentDate.valueOf());
        const dayNr = (currentDate.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        }
        const weekOfYear = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

        const dayOfWeekJs = currentDate.getDay(); // 0 = Domingo, 1 = Lunes
        const dayOfWeekIso = dayOfWeekJs === 0 ? 7 : dayOfWeekJs; // 1 = Lunes, 7 = Domingo
        const dayName = dayNamesEs[dayOfWeekJs];
        const isWeekend = dayOfWeekIso === 6 || dayOfWeekIso === 7;

        const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isHolidayPe = peruHolidays.has(mmdd);

        batch.push([
          dateKey, dateStr, year, quarter, quarterName, month, monthName,
          monthYear, weekOfYear, day, dayOfWeekIso, dayName, isWeekend, isHolidayPe
        ]);

        if (batch.length >= batchSize) {
          await this.insertDateBatch(client, batch);
          totalInserted += batch.length;
          batch = [];
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (batch.length > 0) {
        await this.insertDateBatch(client, batch);
        totalInserted += batch.length;
      }

      await client.query("COMMIT");
      console.log(`[DIMENSIONS] dim_date poblada exitosamente con ${totalInserted} registros.`);
      return totalInserted;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[DIMENSIONS] Error poblando dim_date:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  private static async insertDateBatch(client: any, batch: any[][]) {
    const valuePlaceholders: string[] = [];
    const flatValues: any[] = [];

    batch.forEach((row, rowIndex) => {
      const offset = rowIndex * 14;
      const placeholders = Array.from({ length: 14 }, (_, i) => `$${offset + i + 1}`);
      valuePlaceholders.push(`(${placeholders.join(", ")})`);
      flatValues.push(...row);
    });

    const sql = `
      INSERT INTO analytics.dim_date (
        date_key, full_date, year, quarter, quarter_name, month, month_name,
        month_year, week_of_year, day_of_month, day_of_week, day_name, is_weekend, is_holiday_pe
      )
      VALUES ${valuePlaceholders.join(", ")}
      ON CONFLICT (date_key) DO NOTHING;
    `;

    await client.query(sql, flatValues);
  }

  /**
   * Sincroniza ubicaciones desde core.projects hacia analytics.dim_geography
   */
  static async syncGeographyDimension() {
    const client = await pool.connect();
    try {
      console.log("[DIMENSIONS] Sincronizando dim_geography...");
      const insertSql = `
        INSERT INTO analytics.dim_geography (country, department, province, district, zone, market_tier)
        SELECT DISTINCT
          'Perú' AS country,
          'Lima' AS department,
          'Lima' AS province,
          COALESCE(TRIM(location), 'Lima Moderna') AS district,
          'Zona Metropolitana' AS zone,
          'STANDARD' AS market_tier
        FROM core.projects
        WHERE location IS NOT NULL AND TRIM(location) <> ''
        ON CONFLICT (country, department, province, district) DO NOTHING;
      `;
      const result = await client.query(insertSql);
      console.log(`[DIMENSIONS] dim_geography sincronizada (${result.rowCount} registros insertados).`);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Sincroniza asesores desde core.parties y crm.leads hacia analytics.dim_advisor
   */
  static async syncAdvisorDimension() {
    const client = await pool.connect();
    try {
      console.log("[DIMENSIONS] Sincronizando dim_advisor con PII masking...");
      
      // 1. Asesores desde core.parties
      const partiesSql = `
        SELECT id, full_name, email
        FROM core.parties
        ORDER BY created_at ASC;
      `;
      const { rows: parties } = await client.query(partiesSql);

      let upsertCount = 0;
      for (const p of parties) {
        const masked = this.maskEmail(p.email);
        const upsertSql = `
          INSERT INTO analytics.dim_advisor (
            advisor_id, full_name, email_masked, team, status, is_active, etl_updated_at
          )
          VALUES ($1, $2, $3, 'Comercial Alpha', 'ACTIVE', TRUE, CURRENT_TIMESTAMP)
          ON CONFLICT (advisor_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email_masked = EXCLUDED.email_masked,
            etl_updated_at = CURRENT_TIMESTAMP;
        `;
        await client.query(upsertSql, [p.id, p.full_name, masked]);
        upsertCount++;
      }

      // 2. Asesores por defecto asignados en leads (ej. 'advisor-1')
      const defaultAdvisorSql = `
        INSERT INTO analytics.dim_advisor (
          advisor_id, full_name, email_masked, team, status, is_active
        )
        VALUES ('advisor-1', 'Asesor Comercial 1', 'ad***1@zenplus.pe', 'Comercial Alpha', 'ACTIVE', TRUE)
        ON CONFLICT (advisor_id) DO NOTHING;
      `;
      await client.query(defaultAdvisorSql);

      console.log(`[DIMENSIONS] dim_advisor sincronizada (${upsertCount} asesores procesados).`);
      return upsertCount;
    } finally {
      client.release();
    }
  }

  /**
   * Sincroniza inventario desde inventory.assets y core.projects hacia analytics.dim_asset
   */
  static async syncAssetDimension() {
    const client = await pool.connect();
    try {
      console.log("[DIMENSIONS] Sincronizando dim_asset...");
      const syncSql = `
        INSERT INTO analytics.dim_asset (
          asset_id, asset_code, title, project_name, asset_type,
          current_status, base_price_usd, area_m2, currency, geography_key, source_created_at, etl_updated_at
        )
        SELECT 
          a.id AS asset_id,
          a.code AS asset_code,
          a.title,
          COALESCE(p.name, 'Proyecto Alpha') AS project_name,
          a.type AS asset_type,
          a.status AS current_status,
          COALESCE(a.price, 0.00) AS base_price_usd,
          COALESCE(a.area, 0.00) AS area_m2,
          COALESCE(a.currency, 'USD') AS currency,
          COALESCE(g.geography_key, -1) AS geography_key,
          a.created_at AS source_created_at,
          CURRENT_TIMESTAMP AS etl_updated_at
        FROM inventory.assets a
        LEFT JOIN core.projects p ON a.project_id = p.id
        LEFT JOIN analytics.dim_geography g ON g.district = TRIM(p.location)
        ON CONFLICT (asset_id) DO UPDATE SET
          asset_code = EXCLUDED.asset_code,
          title = EXCLUDED.title,
          project_name = EXCLUDED.project_name,
          asset_type = EXCLUDED.asset_type,
          current_status = EXCLUDED.current_status,
          base_price_usd = EXCLUDED.base_price_usd,
          area_m2 = EXCLUDED.area_m2,
          geography_key = EXCLUDED.geography_key,
          etl_updated_at = CURRENT_TIMESTAMP;
      `;

      const result = await client.query(syncSql);
      console.log(`[DIMENSIONS] dim_asset sincronizada (${result.rowCount} activos procesados).`);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Ejecuta todo el ciclo ETL de dimensiones de la Fase 4
   */
  static async runFullDimensionsSync() {
    console.log("=== INICIANDO SINCRONIZACIÓN DE DIMENSIONES CORE (ALP4-003) ===");
    await this.populateDateDimension();
    await this.syncGeographyDimension();
    await this.syncAdvisorDimension();
    await this.syncAssetDimension();
    console.log("=== SINCRONIZACIÓN DE DIMENSIONES COMPLETADA EXITOSAMENTE ===");
  }
}
