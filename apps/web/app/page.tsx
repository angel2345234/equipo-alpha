import { getAssets, getLeads } from "../lib/api";
import AssetCatalog from "./AssetCatalog";
import DashboardShell from "./DashboardShell";
import type { CountItem, DashboardChartsData } from "./DashboardCharts";

// Etiquetas en español para los códigos que devuelve la API
const COMMERCIAL_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVATION_HOLD: "Retenido por reserva",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  RENTED: "Alquilado",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Departamentos",
  LOT: "Lotes",
  HOUSE: "Casas",
  OFFICE: "Oficinas",
  COMMERCIAL: "Locales comerciales",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  DISQUALIFIED: "Descalificado",
};

/** Cuenta elementos por una clave y devuelve los grupos de mayor a menor. */
function countBy<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
  labels: Record<string, string>,
): CountItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || "SIN_DATO";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ label: labels[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function HomePage() {
  const [assets, leads] = await Promise.all([
    getAssets(),
    getLeads(),
  ]);

  // Disponible = estado comercial AVAILABLE (separado de publicación desde la Fase 2).
  // Si la API no envía commercial_status, se usa el estado antiguo como respaldo.
  const commercialStatus = (asset: (typeof assets)[number]) =>
    asset.commercial_status ?? asset.status;

  const availableAssets = assets.filter(
    (asset) => commercialStatus(asset) === "AVAILABLE",
  ).length;

  // Los conteos se calculan aquí (servidor): al navegador solo viajan números,
  // nunca los datos personales de los leads.
  const charts: DashboardChartsData = {
    totalAssets: assets.length,
    availableAssets,
    inventoryByStatus: countBy(assets, commercialStatus, COMMERCIAL_STATUS_LABELS),
    inventoryByType: countBy(assets, (asset) => asset.type, ASSET_TYPE_LABELS),
    leadsByStatus: countBy(leads, (lead) => lead.status, LEAD_STATUS_LABELS),
  };

  return (
    <DashboardShell
      availableAssets={availableAssets}
      totalLeads={leads.length}
      charts={charts}
    >
      <AssetCatalog initialAssets={assets} />
    </DashboardShell>
  );
}
