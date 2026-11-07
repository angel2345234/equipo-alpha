import styles from "./dashboard.module.css";

/** Un grupo contado: etiqueta legible + cantidad. */
export type CountItem = {
  label: string;
  count: number;
};

export type DashboardChartsData = {
  totalAssets: number;
  availableAssets: number;
  inventoryByStatus: CountItem[];
  inventoryByType: CountItem[];
  leadsByStatus: CountItem[];
};

const ASSET_UNIT = { one: "inmueble", other: "inmuebles" };
const LEAD_UNIT = { one: "lead", other: "leads" };

const formatPercent = (value: number) =>
  value.toLocaleString("es-PE", { maximumFractionDigits: 1 });

/**
 * Barras horizontales de una sola serie.
 * El largo de cada barra es proporcional al mayor valor del grupo,
 * y cada fila muestra su valor al final (no depende solo del color).
 */
function BarList({
  items,
  unit,
}: {
  items: CountItem[];
  unit: { one: string; other: string };
}) {
  if (items.length === 0) {
    return <p className={styles.chartEmpty}>Sin datos disponibles.</p>;
  }

  const max = Math.max(...items.map((item) => item.count));
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <ul className={styles.barList}>
      {items.map((item) => {
        const share = total > 0 ? (item.count / total) * 100 : 0;
        const unitLabel = item.count === 1 ? unit.one : unit.other;
        const tooltip = `${item.label}: ${item.count} ${unitLabel} (${formatPercent(share)} %)`;

        return (
          <li key={item.label} className={styles.barRow} tabIndex={0} aria-label={tooltip}>
            <span className={styles.barLabel}>{item.label}</span>
            <span className={styles.barTrack} aria-hidden="true">
              <span
                className={styles.barFill}
                style={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%` }}
              />
            </span>
            <span className={styles.barValue}>{item.count}</span>
            <span className={styles.barTooltip} aria-hidden="true">
              <strong>{item.label}</strong>
              {item.count} {unitLabel} · {formatPercent(share)} %
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardCharts({ data }: { data: DashboardChartsData }) {
  const availability =
    data.totalAssets > 0 ? (data.availableAssets / data.totalAssets) * 100 : 0;

  return (
    <section className={styles.chartsGrid} aria-label="Indicadores del negocio">
      {/* KPI P0-05: un solo número clave → tarjeta destacada, no gráfica */}
      <article className={`${styles.chartCard} ${styles.chartHero}`}>
        <span className={styles.chartTitle}>Disponibilidad de inventario</span>
        <strong className={styles.heroValue}>{formatPercent(availability)} %</strong>
        <span className={styles.chartSubtitle}>
          {data.availableAssets} de {data.totalAssets} inmuebles disponibles para la venta
        </span>
        <span
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={Math.round(availability)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Porcentaje de inventario disponible"
        >
          <span className={styles.progressFill} style={{ width: `${availability}%` }} />
        </span>
        <span className={styles.chartFootnote}>KPI P0-05 · según estado comercial</span>
      </article>

      <article className={styles.chartCard}>
        <span className={styles.chartTitle}>Inventario por estado comercial</span>
        <span className={styles.chartSubtitle}>Cantidad de inmuebles</span>
        <BarList items={data.inventoryByStatus} unit={ASSET_UNIT} />
      </article>

      <article className={styles.chartCard}>
        <span className={styles.chartTitle}>Inventario por tipo</span>
        <span className={styles.chartSubtitle}>Cantidad de inmuebles</span>
        <BarList items={data.inventoryByType} unit={ASSET_UNIT} />
      </article>

      <article className={styles.chartCard}>
        <span className={styles.chartTitle}>Leads por estado</span>
        <span className={styles.chartSubtitle}>Cantidad de prospectos</span>
        <BarList items={data.leadsByStatus} unit={LEAD_UNIT} />
      </article>
    </section>
  );
}
