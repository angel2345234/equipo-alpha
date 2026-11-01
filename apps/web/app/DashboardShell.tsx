"use client";

import { useState, type ReactNode } from "react";
import styles from "./dashboard.module.css";

type DashboardShellProps = {
  children: ReactNode;
  availableAssets: number;
  totalLeads: number;
};

const navigation = [
  { id: "resumen", label: "Resumen ejecutivo", icon: "▦" },
  { id: "comercial", label: "Comercial", icon: "◎" },
  { id: "inmobiliario", label: "Inmobiliario", icon: "⌂" },
  { id: "financiero", label: "Financiero", icon: "▤" },
  { id: "operaciones", label: "Operaciones", icon: "⇄" },
] as const;

type SectionId = (typeof navigation)[number]["id"];

const pendingModules: Record<
  Exclude<SectionId, "resumen" | "inmobiliario">,
  { title: string; description: string }
> = {
  comercial: {
    title: "Gestión comercial",
    description:
      "Aquí se integrarán los leads, oportunidades, visitas y seguimiento comercial.",
  },
  financiero: {
    title: "Gestión financiera",
    description:
      "Aquí se integrarán los indicadores financieros, simulaciones y seguimiento económico.",
  },
  operaciones: {
    title: "Gestión de operaciones",
    description:
      "Aquí se integrarán las operaciones, etapas, cierres y su seguimiento.",
  },
};

export default function DashboardShell({
  children,
  availableAssets,
  totalLeads,
}: DashboardShellProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("resumen");

  const currentSection = navigation.find(
    (item) => item.id === activeSection,
  );

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>Z</div>
          <div>
            <strong>ZENPLUS</strong>
            <span>OPERATING SYSTEM</span>
          </div>
        </div>

        <div className={styles.navigationLabel}>PLATAFORMA</div>

        <nav className={styles.navigation} aria-label="Navegación principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${
                activeSection === item.id ? styles.navItemActive : ""
              }`}
              onClick={() => setActiveSection(item.id)}
              aria-current={activeSection === item.id ? "page" : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span className={styles.statusDot} />
          Sistema Zenplus
          <small>Panel de gestión</small>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.breadcrumb}>ZENPLUS / PLATAFORMA</span>
            <h1>{currentSection?.label}</h1>
          </div>
          <div className={styles.topbarInfo}>
            <span className={styles.environment}>ENTORNO DE GESTIÓN</span>
            <div className={styles.avatar}>Z</div>
          </div>
        </header>

        <div className={styles.content}>
          {activeSection === "resumen" && (
            <section>
              <div className={styles.welcome}>
                <div>
                  <span className={styles.eyebrow}>CENTRO DE CONTROL</span>
                  <h2>Resumen ejecutivo</h2>
                  <p>
                    Vista general de la gestión inmobiliaria y operativa de
                    Zenplus.
                  </p>
                </div>
              </div>

              <div className={styles.metricsGrid}>
                {[
                  {
                    label: "Inmuebles disponibles",
                    value: availableAssets.toLocaleString("es-PE"),
                    detail: "Inventario inmobiliario",
                  },
                  {
                    label: "Leads comerciales",
                    value: totalLeads.toLocaleString("es-PE"),
                    detail: "Actividad comercial",
                  },
                  {
                    label: "Operaciones activas",
                    value: "Pendiente de conexión",
                    detail: "Seguimiento operativo",
                  },
                  {
                    label: "Indicadores financieros",
                    value: "Pendiente de conexión",
                    detail: "Información financiera",
                  },
                ].map((metric) => (
                  <article className={styles.metricCard} key={metric.label}>
                    <span className={styles.metricLabel}>{metric.label}</span>
                    <strong className={styles.metricValue}>{metric.value}</strong>
                    <span className={styles.metricDetail}>{metric.detail}</span>
                  </article>
                ))}
              </div>

              <section className={styles.panel}>
                <div className={styles.panelHeading}>
                  <div>
                    <h3>Centro de módulos</h3>
                    <p>Accede a las áreas principales de Zenplus OS.</p>
                  </div>
                </div>

                <div className={styles.moduleGrid}>
                  {navigation
                    .filter((item) => item.id !== "resumen")
                    .map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={styles.moduleCard}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <span className={styles.moduleIcon}>{item.icon}</span>
                        <strong>{item.label}</strong>
                        <span>Ingresar al módulo →</span>
                      </button>
                    ))}
                </div>
              </section>
            </section>
          )}

          {activeSection === "inmobiliario" && (
            <section>
              <div className={styles.sectionIntro}>
                <span className={styles.eyebrow}>INVENTARIO</span>
                <h2>Gestión inmobiliaria</h2>
                <p>Consulta y administra el catálogo de propiedades.</p>
              </div>
              {children}
            </section>
          )}

          {activeSection !== "resumen" &&
            activeSection !== "inmobiliario" && (
              <section className={styles.pendingPanel}>
                <span className={styles.pendingIcon}>◷</span>
                <span className={styles.eyebrow}>MÓDULO EN PREPARACIÓN</span>
                <h2>{pendingModules[activeSection].title}</h2>
                <p>{pendingModules[activeSection].description}</p>
                <span className={styles.pendingNote}>
                  Los datos se mostrarán cuando esté disponible su conexión de
                  lectura.
                </span>
              </section>
            )}
        </div>
      </main>
    </div>
  );
}


