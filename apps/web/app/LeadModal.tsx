"use client";

import { useState } from "react";
import { createLead } from "../lib/api";

interface LeadModalProps {
  assetId: string;
  assetTitle: string;
  onClose: () => void;
}

export default function LeadModal({ assetId, assetTitle, onClose }: LeadModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "SUCCESS" | "ERROR">("IDLE");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("LOADING");
    try {
      await createLead({
        fullName,
        email,
        phone,
        assetId,
        message,
        source: "WEB_PORTAL",
      });
      setStatus("SUCCESS");
    } catch {
      setStatus("ERROR");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ backgroundColor: "#fff", padding: "2rem", borderRadius: "8px", width: "100%", maxWidth: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        {status === "SUCCESS" ? (
          <div>
            <h3 style={{ color: "#065f46", margin: "0 0 0.5rem 0" }}>¡Solicitud enviada!</h3>
            <p style={{ color: "#4b5563", fontSize: "0.9rem" }}>Un asesor se comunicará contigo a la brevedad.</p>
            <button
              onClick={onClose}
              style={{ marginTop: "1rem", width: "100%", padding: "0.6rem", background: "#111827", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.2rem", color: "#111827" }}>Solicitar información</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{assetTitle}</p>

            <input
              type="text"
              placeholder="Nombre completo *"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            />
            <input
              type="email"
              placeholder="Correo electrónico *"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            />
            <input
              type="tel"
              placeholder="Teléfono / WhatsApp *"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            />
            <textarea
              placeholder="Mensaje opcional"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            />

            {status === "ERROR" && (
              <span style={{ color: "#dc2626", fontSize: "0.8rem" }}>Ocurrió un error al enviar. Intenta nuevamente.</span>
            )}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, padding: "0.6rem", background: "#f3f4f6", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={status === "LOADING"}
                style={{ flex: 1, padding: "0.6rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                {status === "LOADING" ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}