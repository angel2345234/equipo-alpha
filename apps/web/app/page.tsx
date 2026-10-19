import { getAssets } from "../lib/api";
import AssetCatalog from "./AssetCatalog";

export default async function HomePage() {
  const assets = await getAssets();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", color: "#111827", margin: 0 }}>ZENPLUS · Catálogo de Propiedades</h1>
        <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>Inventario disponible en tiempo real</p>
      </header>

      <AssetCatalog initialAssets={assets} />
    </main>
  );
}