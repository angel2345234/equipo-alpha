"use client";

import { useState, useEffect } from "react";
import { Asset, simulateQuote, QuoteSimulationResponse } from "../lib/api";

interface QuoteModalProps {
  asset: Asset;
  onClose: () => void;
}

export default function QuoteModal({ asset, onClose }: QuoteModalProps) {
  const price = Number(asset.price);
  const defaultDownPayment = Math.round(price * 0.15); // 15% cuota inicial por defecto

  const [downPayment, setDownPayment] = useState<number>(defaultDownPayment);
  const [installments, setInstallments] = useState<number>(24);
  const [tea, setTea] = useState<number>(12); // TEA 12% por defecto
  const [result, setResult] = useState<QuoteSimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await simulateQuote({
        assetId: asset.id,
        totalPrice: price,
        downPayment,
        installments,
        annualInterestRate: tea,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error al simular cotización");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [downPayment, installments, tea]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827" }}>Simulador de Financiamiento</h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{asset.title} - Código: {asset.code}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            &times;
          </button>
        </div>

        {/* Parámetros de simulación */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>
              Inicial (USD)
            </label>
            <input
              type="number"
              value={downPayment}
              min={0}
              max={price - 1}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>
              Plazo (Meses)
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#fff" }}
            >
              <option value={12}>12 meses (1 año)</option>
              <option value={24}>24 meses (2 años)</option>
              <option value={36}>36 meses (3 años)</option>
              <option value={48}>48 meses (4 años)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>
              Tasa Anual (TEA %)
            </label>
            <input
              type="number"
              value={tea}
              min={0}
              max={50}
              onChange={(e) => setTea(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
          </div>
        </div>

        {/* Resumen del cálculo */}
        {result && (
          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "8px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Monto a Financiar</span>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#111827" }}>
                USD {result.financedAmount.toLocaleString("en-US")}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Cuota Mensual Aprox.</span>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#2563eb" }}>
                USD {result.monthlyPayment.toLocaleString("en-US")}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Interés Total</span>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#111827" }}>
                USD {result.totalInterest.toLocaleString("en-US")}
              </div>
            </div>
          </div>
        )}

        {/* Tabla del Cronograma Francés */}
        {result && (
          <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "right" }}>
              <thead style={{ backgroundColor: "#f9fafb", position: "sticky", top: 0 }}>
                <tr>
                  <th style={{ padding: "0.5rem", textAlign: "center" }}>N°</th>
                  <th style={{ padding: "0.5rem", textAlign: "center" }}>Vencimiento</th>
                  <th style={{ padding: "0.5rem" }}>Cuota</th>
                  <th style={{ padding: "0.5rem" }}>Capital</th>
                  <th style={{ padding: "0.5rem" }}>Interés</th>
                  <th style={{ padding: "0.5rem" }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((item) => (
                  <tr key={item.installmentNumber} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>{item.installmentNumber}</td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>{item.dueDate}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 600 }}>USD {item.paymentAmount.toLocaleString("en-US")}</td>
                    <td style={{ padding: "0.5rem" }}>USD {item.principalPayment.toLocaleString("en-US")}</td>
                    <td style={{ padding: "0.5rem", color: "#dc2626" }}>USD {item.interestPayment.toLocaleString("en-US")}</td>
                    <td style={{ padding: "0.5rem", color: "#4b5563" }}>USD {item.remainingBalance.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: "#111827",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}