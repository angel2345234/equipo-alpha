"use client";

import { useState } from "react";
import { Asset } from "../lib/api";
import LeadModal from "./LeadModal";
import QuoteModal from "./QuoteModal";

export default function AssetCatalog({ initialAssets }: { initialAssets: Asset[] }) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [quotingAsset, setQuotingAsset] = useState<Asset | null>(null);

  // Estados de los campos de filtro
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Lista de propiedades visibles
  const [displayAssets, setDisplayAssets] = useState<Asset[]>(initialAssets);

  // Acción al presionar "Filtrar"
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const result = initialAssets.filter((asset) => {
      if (type && asset.type !== type) return false;
      if (status && asset.status !== status) return false;
      if (maxPrice && Number(asset.price) > Number(maxPrice)) return false;
      return true;
    });
    setDisplayAssets(result);
  };

  // Acción al presionar "Limpiar filtros"
  const handleReset = () => {
    setType("");
    setStatus("");
    setMaxPrice("");
    setDisplayAssets(initialAssets);
  };

  return (
    <>
      {/* Barra de Filtros */}
      <form
        onSubmit={handleApplyFilters}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 600 }}>Tipo de inmueble</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: "0.55rem", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#fff" }}
          >
            <option value="">Todos los tipos</option>
            <option value="LOT">Lotes de terreno</option>
            <option value="APARTMENT">Departamentos</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 600 }}>Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: "0.55rem", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#fff" }}
          >
            <option value="">Todos los estados</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="RESERVED">Reservados</option>
            <option value="DRAFT">Borradores</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 600 }}>Precio Máximo (USD)</label>
          <input
            type="number"
            placeholder="Ej: 150000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ padding: "0.55rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", marginTop: "1.25rem" }}>
          <button
            type="submit"
            style={{
              padding: "0.55rem 1.25rem",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Filtrar
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "0.55rem 1rem",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Limpiar filtros
          </button>
        </div>

        <span style={{ fontSize: "0.85rem", color: "#6b7280", marginLeft: "auto" }}>
          Mostrando {displayAssets.length} de {initialAssets.length} propiedades
        </span>
      </form>

      {/* Grid de Activos */}
      {displayAssets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
          No se encontraron propiedades que coincidan con los criterios seleccionados.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {displayAssets.map((asset) => (
            <div
              key={asset.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1.25rem",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    backgroundColor: asset.status === "AVAILABLE" ? "#ecfdf5" : "#fef3c7",
                    color: asset.status === "AVAILABLE" ? "#065f46" : "#92400e",
                    fontWeight: 600,
                  }}
                >
                  {asset.status}
                </span>

                <h3 style={{ margin: "0.75rem 0 0.25rem 0", fontSize: "1.1rem" }}>{asset.title}</h3>
                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1rem 0" }}>Código: {asset.code}</p>
              </div>

              <div>
                <div
                  style={{
                    borderTop: "1px solid #f3f4f6",
                    paddingTop: "0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "1rem",
                  }}
                >
                  <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#0f172a" }}>
                    {asset.currency} {Number(asset.price).toLocaleString("en-US")}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{asset.area} m²</span>
                </div>

                {/* Acciones de Tarjeta */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setSelectedAsset(asset)}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      backgroundColor: "#111827",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    Contactar Asesor
                  </button>

                  <button
                    onClick={() => setQuotingAsset(asset)}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      backgroundColor: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    Simular Cuotas
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Captura de Leads */}
      {selectedAsset && (
        <LeadModal
          assetId={selectedAsset.id}
          assetTitle={selectedAsset.title}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {/* Modal de Simulación y Cronograma Francés */}
      {quotingAsset && (
        <QuoteModal
          asset={quotingAsset}
          onClose={() => setQuotingAsset(null)}
        />
      )}
    </>
  );
}