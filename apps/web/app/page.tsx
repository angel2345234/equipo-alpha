import { getAssets, getLeads } from "../lib/api";
import AssetCatalog from "./AssetCatalog";
import DashboardShell from "./DashboardShell";

export default async function HomePage() {
  const [assets, leads] = await Promise.all([
    getAssets(),
    getLeads(),
  ]);

  const availableAssets = assets.filter(
    (asset) => asset.status === "AVAILABLE",
  ).length;

  return (
    <DashboardShell
      availableAssets={availableAssets}
      totalLeads={leads.length}
    >
      <AssetCatalog initialAssets={assets} />
    </DashboardShell>
  );
}
