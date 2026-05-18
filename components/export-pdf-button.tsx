"use client";

import { useState } from "react";

type Props = { analysisId: string; className?: string };

interface Hallazgo {
  nombre?: string;
  nombreCientifico?: string;
  severidad?: string;
  confianza?: string;
  descripcion?: string;
  productoRecomendado?: string;
  modoAplicacion?: string;
  periodoCarencia?: string;
}

interface Pilar {
  hallazgos?: Hallazgo[];
  sinHallazgos?: boolean;
  nota?: string;
}

interface PlanItem {
  prioridad?: string;
  titulo?: string;
  detalle?: string;
  plazo?: string;
}

interface AnalysisResult {
  diagnosticoPrincipal?: string;
  severidad?: string;
  confianza?: number;
  diagnosticoIntegrado?: string;
  accionUrgente?: string;
  planAccion?: PlanItem[];
  disclaimer?: string;
  pilares?: {
    follaje?: Pilar;
    plagas?: Pilar;
    nutricion?: Pilar;
  };
}

interface ExportData {
  id: string;
  city: string;
  address: string;
  fieldNotes?: string | null;
  createdAt: string;
  provider: string;
  model: string;
  analystUsername: string;
  resultJson?: unknown;
  errorMessage?: string | null;
}

export default function ExportPdfButton({ analysisId, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/export-pdf`);
      if (!res.ok) {
        alert("No se pudo obtener los datos del análisis.");
        return;
      }
      const data = (await res.json()) as ExportData;

      // Importación dinámica para no inflar el bundle inicial
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const PAGE_W = 210;
      const MARGIN = 18;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const GREEN = [30, 92, 53] as const;
      const AMBER = [186, 117, 23] as const;
      const RED = [154, 52, 18] as const;
      const GRAY = [100, 100, 100] as const;
      const LIGHT = [245, 245, 240] as const;

      let y = 0;

      function checkPage(needed = 14) {
        if (y + needed > 275) {
          doc.addPage();
          y = 18;
        }
      }

      function setColor(rgb: readonly [number, number, number]) {
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      }

      function drawRect(
        x: number,
        yy: number,
        w: number,
        h: number,
        rgb: readonly [number, number, number],
        fill = true,
      ) {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
        if (fill) doc.rect(x, yy, w, h, "F");
        else doc.rect(x, yy, w, h, "S");
      }

      function wrapText(
        text: string,
        x: number,
        yy: number,
        maxW: number,
        lineH: number,
        fontSize: number,
      ): number {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxW) as string[];
        for (const line of lines) {
          checkPage(lineH);
          doc.text(line, x, yy);
          yy += lineH;
        }
        return yy;
      }

      // ─── HEADER ───────────────────────────────────────────────────────────
      drawRect(0, 0, PAGE_W, 28, GREEN);
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN - 2, 7, 4, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("EcuAgroVision", MARGIN + 4, 16);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Diagnóstico Fitosanitario · Cultivo de Banano", MARGIN + 4, 22);

      // Fecha en header (derecha)
      const fechaStr = new Date(data.createdAt).toLocaleString("es-EC", {
        dateStyle: "long",
        timeStyle: "short",
      });
      doc.setFontSize(8);
      doc.text(fechaStr, PAGE_W - MARGIN, 22, { align: "right" });

      y = 36;

      // ─── BLOQUE CAMPO ─────────────────────────────────────────────────────
      drawRect(MARGIN, y, CONTENT_W, 6, LIGHT);
      setColor(GREEN);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DE CAMPO", MARGIN + 3, y + 4.2);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const fields: [string, string][] = [
        ["Ciudad / zona", data.city],
        ["Dirección / parcela", data.address],
        ...(data.fieldNotes ? [["Notas de campo", data.fieldNotes] as [string, string]] : []),
        ["Analista", data.analystUsername],
        ["Modelo IA", `${data.provider} · ${data.model}`],
      ];

      for (const [label, value] of fields) {
        checkPage(10);
        setColor(GRAY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label + ":", MARGIN, y);
        setColor([30, 30, 30]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        y = wrapText(value, MARGIN + 38, y, CONTENT_W - 38, 5, 9);
        y += 1;
      }
      y += 4;

      // ─── RESULTADO ─────────────────────────────────────────────────────────
      const result = data.resultJson as AnalysisResult | null;

      if (data.errorMessage && !result) {
        checkPage(20);
        drawRect(MARGIN, y, CONTENT_W, 6, [245, 220, 210]);
        setColor(RED);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("AVISO DEL ANÁLISIS", MARGIN + 3, y + 4.2);
        y += 8;
        setColor([80, 30, 20]);
        doc.setFont("helvetica", "normal");
        y = wrapText(data.errorMessage, MARGIN, y, CONTENT_W, 5, 9);
        y += 4;
      }

      if (result) {
        // Diagnóstico principal
        checkPage(22);
        drawRect(MARGIN, y, CONTENT_W, 6, LIGHT);
        setColor(GREEN);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("RESULTADO DEL DIAGNÓSTICO", MARGIN + 3, y + 4.2);
        y += 9;

        if (result.diagnosticoPrincipal) {
          setColor([20, 20, 20]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          y = wrapText(result.diagnosticoPrincipal, MARGIN, y, CONTENT_W, 7, 13);
          y += 1;
        }

        // Severidad + confianza en línea
        checkPage(10);
        const sevText = result.severidad ? `Severidad: ${result.severidad}` : "";
        const confText = result.confianza != null ? `Confianza del modelo: ${result.confianza}%` : "";
        if (sevText) {
          setColor(RED);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(sevText, MARGIN, y);
        }
        if (confText) {
          setColor(GRAY);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text(confText, PAGE_W - MARGIN, y, { align: "right" });
        }
        y += 7;

        // Pilares
        const pilarDefs = [
          { key: "follaje" as const, label: "Pilar 1 — Enfermedades del follaje" },
          { key: "plagas" as const, label: "Pilar 2 — Plagas y daños físicos" },
          { key: "nutricion" as const, label: "Pilar 3 — Estado nutricional" },
        ];

        for (const { key, label } of pilarDefs) {
          const pilar = result.pilares?.[key];
          if (!pilar) continue;
          checkPage(14);

          drawRect(MARGIN, y, CONTENT_W, 6, [...GREEN, 0.12] as unknown as readonly [number, number, number]);
          doc.setFillColor(240, 247, 243);
          doc.rect(MARGIN, y, CONTENT_W, 6, "F");
          setColor(GREEN);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(label.toUpperCase(), MARGIN + 3, y + 4.2);
          y += 8;

          if (pilar.sinHallazgos) {
            setColor(GREEN);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            y = wrapText(`✓ Sin hallazgos. ${pilar.nota ?? ""}`, MARGIN + 2, y, CONTENT_W - 4, 5, 9);
            y += 3;
          } else {
            for (const h of pilar.hallazgos ?? []) {
              checkPage(18);
              setColor([20, 20, 20]);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(9);
              const title = [h.nombre, h.nombreCientifico ? `(${h.nombreCientifico})` : ""].filter(Boolean).join(" ");
              y = wrapText(title, MARGIN + 2, y, CONTENT_W - 4, 5, 9);

              const tags = [
                h.severidad ? `Severidad: ${h.severidad}` : "",
                h.confianza ? `Confianza: ${h.confianza}` : "",
              ].filter(Boolean).join("  ·  ");
              if (tags) {
                setColor(AMBER);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                y = wrapText(tags, MARGIN + 4, y, CONTENT_W - 8, 5, 8);
              }
              if (h.descripcion) {
                setColor(GRAY);
                doc.setFont("helvetica", "normal");
                y = wrapText(h.descripcion, MARGIN + 4, y, CONTENT_W - 8, 4.5, 8);
              }
              if (h.productoRecomendado) {
                setColor([30, 80, 50]);
                doc.setFont("helvetica", "italic");
                y = wrapText(`Producto: ${h.productoRecomendado}${h.modoAplicacion ? " — " + h.modoAplicacion : ""}${h.periodoCarencia ? " · Carencia: " + h.periodoCarencia : ""}`, MARGIN + 4, y, CONTENT_W - 8, 4.5, 8);
              }
              y += 3;
            }
            if (pilar.nota) {
              setColor(GRAY);
              doc.setFont("helvetica", "italic");
              y = wrapText(pilar.nota, MARGIN + 2, y, CONTENT_W - 4, 4.5, 8);
              y += 2;
            }
          }
          y += 2;
        }

        // Diagnóstico integrado
        if (result.diagnosticoIntegrado) {
          checkPage(18);
          doc.setFillColor(240, 247, 243);
          doc.rect(MARGIN, y, CONTENT_W, 6, "F");
          setColor(GREEN);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("DIAGNÓSTICO INTEGRADO", MARGIN + 3, y + 4.2);
          y += 8;
          setColor([20, 20, 20]);
          doc.setFont("helvetica", "normal");
          y = wrapText(result.diagnosticoIntegrado, MARGIN, y, CONTENT_W, 5, 9);
          y += 2;
        }

        if (result.accionUrgente) {
          checkPage(14);
          doc.setFillColor(255, 240, 230);
          doc.rect(MARGIN, y, CONTENT_W, 6, "F");
          setColor(RED);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("ACCIÓN URGENTE", MARGIN + 3, y + 4.2);
          y += 8;
          setColor([80, 20, 10]);
          doc.setFont("helvetica", "bold");
          y = wrapText(result.accionUrgente, MARGIN, y, CONTENT_W, 5, 9);
          y += 2;
        }

        // Plan de acción
        if (result.planAccion && result.planAccion.length > 0) {
          checkPage(18);
          doc.setFillColor(240, 247, 243);
          doc.rect(MARGIN, y, CONTENT_W, 6, "F");
          setColor(GREEN);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("PLAN DE ACCIÓN RECOMENDADO", MARGIN + 3, y + 4.2);
          y += 8;

          for (const item of result.planAccion) {
            checkPage(20);
            const priColor: readonly [number, number, number] =
              item.prioridad === "p1" ? RED :
              item.prioridad === "p2" ? AMBER :
              GREEN;

            drawRect(MARGIN, y, 8, 7, priColor);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.text((item.prioridad ?? "").toUpperCase(), MARGIN + 4, y + 4.5, { align: "center" });

            setColor([20, 20, 20]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            y = wrapText(item.titulo ?? "", MARGIN + 11, y, CONTENT_W - 13, 5, 9);

            if (item.detalle) {
              setColor(GRAY);
              doc.setFont("helvetica", "normal");
              y = wrapText(item.detalle, MARGIN + 11, y, CONTENT_W - 13, 4.5, 8);
            }
            if (item.plazo) {
              setColor(AMBER);
              doc.setFont("helvetica", "italic");
              y = wrapText(`⏱ ${item.plazo}`, MARGIN + 11, y, CONTENT_W - 13, 4.5, 8);
            }
            y += 4;
          }
        }

        // Disclaimer
        if (result.disclaimer) {
          checkPage(16);
          doc.setFillColor(250, 249, 245);
          doc.setDrawColor(200, 200, 190);
          doc.rect(MARGIN, y, CONTENT_W, 2, "S");
          y += 4;
          setColor(GRAY);
          doc.setFont("helvetica", "italic");
          y = wrapText(`⚠ ${result.disclaimer}`, MARGIN, y, CONTENT_W, 4.5, 7.5);
        }
      }

      // ─── FOOTER en cada página ────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawRect(0, 287, PAGE_W, 10, GREEN);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("EcuAgroVision — Diagnóstico Fitosanitario Asistido por IA", MARGIN, 293);
        doc.text(`Analista: ${data.analystUsername}   ·   Página ${p} de ${totalPages}`, PAGE_W - MARGIN, 293, { align: "right" });
      }

      const safeCity = data.city.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
      const safeDate = data.createdAt.slice(0, 10);
      doc.save(`EcuAgroVision_${safeCity}_${safeDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void handleExport()}
      disabled={busy}
    >
      {busy ? "Generando PDF…" : "Exportar PDF"}
    </button>
  );
}
