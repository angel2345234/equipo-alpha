"use client";

import { useState } from "react";
import { Asset } from "../lib/api";
import LeadModal from "./LeadModal";
import QuoteModal from "./QuoteModal";
import styles from "./AssetCatalog.module.css";

// Estado real de venta: commercial_status (si no viene, usamos status como respaldo)
const commercialStatus = (asset: Asset) => asset.commercial_status ?? asset.status;

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVATION_HOLD: "Retenido por reserva",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  RENTED: "Alquilado",
};

// Clase de color del badge según el estado
const badgeClass = (value: string) => {
  if (value === "AVAILABLE") return styles.badgeAvailable;
  if (value === "RESERVATION_HOLD" || value === "RESERVED") return styles.badgeHold;
  return styles.badgeClosed;
};

const formatNumber = (value: number | string) => Number(value).toLocaleString("es-PE");

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
      if (status && commercialStatus(asset) !== status) return false;
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
      <form onSubmit={handleApplyFilters} className={styles.filters}>
        <label className={styles.field}>
          <span className={styles.label}>Tipo de inmueble</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={styles.control}>
            <option value="">Todos los tipos</option>
            <option value="LOT">Lotes de terreno</option>
            <option value="APARTMENT">Departamentos</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Estado comercial</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={styles.control}>
            <option value="">Todos los estados</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="RESERVATION_HOLD">Retenidos por reserva</option>
            <option value="RESERVED">Reservados</option>
            <option value="SOLD">Vendidos</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Precio máximo (USD)</span>
          <input
            type="number"
            placeholder="Ej: 150000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={styles.control}
          />
        </label>

        <div className={styles.filterActions}>
          <button type="submit" className={`${styles.button} ${styles.buttonGold}`}>
            Filtrar
          </button>
          <button type="button" onClick={handleReset} className={`${styles.button} ${styles.buttonGhost}`}>
            Limpiar filtros
          </button>
        </div>

        <span className={styles.counter}>
          Mostrando <strong>{displayAssets.length}</strong> de {initialAssets.length} propiedades
        </span>
      </form>

      {/* Grid de Activos */}
      {displayAssets.length === 0 ? (
        <div className={styles.empty}>
          No se encontraron propiedades que coincidan con los criterios seleccionados.
        </div>
      ) : (
        <div className={styles.grid}>
          {displayAssets.map((asset) => {
            const current = commercialStatus(asset);
            return (
              <article key={asset.id} className={styles.card}>
                <div>
                  <span className={`${styles.badge} ${badgeClass(current)}`}>
                    {STATUS_LABELS[current] ?? current}
                  </span>
                  <h3 className={styles.title}>{asset.title}</h3>
                  <p className={styles.code}>Código: {asset.code}</p>
                </div>

                <div>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>
                      {asset.currency} {formatNumber(asset.price)}
                    </span>
                    <span className={styles.area}>{formatNumber(asset.area)} m²</span>
                  </div>

                  {/* Acciones de Tarjeta */}
                  <div className={styles.cardActions}>
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className={`${styles.button} ${styles.buttonDark}`}
                    >
                      Contactar asesor
                    </button>
                    <button
                      onClick={() => setQuotingAsset(asset)}
                      className={`${styles.button} ${styles.buttonGold}`}
                    >
                      Simular cuotas
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
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
