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
  imageBase64?: string | null;
  imageMime?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
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

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ── Constantes de layout ────────────────────────────────────────────
      const PAGE_W   = 210;
      const PAGE_H   = 297;
      const MARGIN   = 16;
      const CONT_W   = PAGE_W - MARGIN * 2;
      const FOOTER_H = 12;
      const SAFE_BOT = PAGE_H - FOOTER_H - 6;

      // ── Paleta de colores ───────────────────────────────────────────────
      const C_GREEN_D: [number,number,number] = [24, 72, 41];   // verde oscuro
      const C_GREEN:   [number,number,number] = [30, 92, 53];   // verde principal
      const C_GREEN_L: [number,number,number] = [232, 248, 238]; // verde claro fondo
      const C_AMBER:   [number,number,number] = [162, 100, 10];
      const C_AMBER_L: [number,number,number] = [255, 245, 220];
      const C_RED:     [number,number,number] = [154, 52, 18];
      const C_RED_L:   [number,number,number] = [255, 240, 235];
      const C_GRAY_D:  [number,number,number] = [55, 55, 55];
      const C_GRAY:    [number,number,number] = [110, 110, 110];
      const C_GRAY_L:  [number,number,number] = [245, 245, 242];
      const C_BLACK:   [number,number,number] = [22, 22, 22];
      const C_WHITE:   [number,number,number] = [255, 255, 255];
      const C_LINE:    [number,number,number] = [220, 218, 210];

      let y = 0;

      // ── Helpers ─────────────────────────────────────────────────────────
      function newPage() {
        doc.addPage();
        y = 22;
        drawFooter();
      }

      function checkPage(needed = 14) {
        if (y + needed > SAFE_BOT) newPage();
      }

      function rgb(c: [number,number,number]) {
        doc.setTextColor(c[0], c[1], c[2]);
      }

      function fillRect(
        x: number, yy: number, w: number, h: number,
        c: [number,number,number],
        r = 0
      ) {
        doc.setFillColor(c[0], c[1], c[2]);
        doc.setDrawColor(c[0], c[1], c[2]);
        if (r > 0) {
          doc.roundedRect(x, yy, w, h, r, r, "F");
        } else {
          doc.rect(x, yy, w, h, "F");
        }
      }

      function strokeRect(
        x: number, yy: number, w: number, h: number,
        c: [number,number,number],
        lw = 0.3
      ) {
        doc.setDrawColor(c[0], c[1], c[2]);
        doc.setLineWidth(lw);
        doc.rect(x, yy, w, h, "S");
      }

      /**
       * Escribe texto con wrap y devuelve la nueva posición Y.
       * El parámetro `leading` es el espacio entre líneas (mm).
       */
      function writeText(
        text: string,
        x: number, yy: number,
        maxW: number,
        font: string,
        style: string,
        size: number,
        color: [number,number,number],
        leading = 1.5,
      ): number {
        doc.setFont(font, style);
        doc.setFontSize(size);
        rgb(color);
        const lines = doc.splitTextToSize(text, maxW) as string[];
        const lineH = size * 0.3528 * leading; // pt → mm con interlineado
        for (const line of lines) {
          checkPage(lineH + 2);
          doc.text(line, x, yy);
          yy += lineH;
        }
        return yy;
      }

      /** Línea horizontal decorativa */
      function hLine(yy: number, c: [number,number,number] = C_LINE, lw = 0.25) {
        doc.setDrawColor(c[0], c[1], c[2]);
        doc.setLineWidth(lw);
        doc.line(MARGIN, yy, PAGE_W - MARGIN, yy);
      }

      /** Encabezado de sección con pill de color */
      function sectionHeader(label: string, yy: number, c: [number,number,number], bg: [number,number,number]): number {
        fillRect(MARGIN, yy, CONT_W, 7, bg, 2);
        // barra izquierda de acento
        fillRect(MARGIN, yy, 3, 7, c, 1);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        rgb(c);
        doc.text(label, MARGIN + 6, yy + 4.8);
        return yy + 10;
      }

      function drawFooter() {
        const p = doc.getCurrentPageInfo().pageNumber;
        const total = doc.getNumberOfPages();
        fillRect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, C_GREEN);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        rgb(C_WHITE);
        doc.text("EcuAgroVision  —  Diagnóstico Fitosanitario Asistido por IA", MARGIN, PAGE_H - 4.5);
        doc.text(
          `Analista: ${data.analystUsername}   ·   Pag. ${p} de ${total}`,
          PAGE_W - MARGIN, PAGE_H - 4.5, { align: "right" }
        );
      }

      // ── PÁGINA 1: HEADER ────────────────────────────────────────────────
      // Bloque verde superior
      fillRect(0, 0, PAGE_W, 36, C_GREEN);
      // Degradado sutil: franja clara en el borde superior
      fillRect(0, 0, PAGE_W, 1, C_GREEN_D);

      // Ícono cuadrado marca
      fillRect(MARGIN, 8, 10, 10, C_WHITE, 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
      doc.text("EA", MARGIN + 5, 14.5, { align: "center" });

      // Nombre de la app
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      rgb(C_WHITE);
      doc.text("EcuAgroVision", MARGIN + 14, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 230, 210);
      doc.text("Diagnóstico Fitosanitario  ·  Cultivo de Banano", MARGIN + 14, 22);

      // Fecha (derecha del header)
      const fechaStr = new Date(data.createdAt).toLocaleDateString("es-EC", {
        day: "2-digit", month: "long", year: "numeric",
      });
      const horaStr = new Date(data.createdAt).toLocaleTimeString("es-EC", {
        hour: "2-digit", minute: "2-digit",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      rgb(C_WHITE);
      doc.text(fechaStr, PAGE_W - MARGIN, 16, { align: "right" });
      doc.setTextColor(200, 230, 210);
      doc.text(horaStr, PAGE_W - MARGIN, 21.5, { align: "right" });

      y = 44;

      // ── BLOQUE DATOS DE CAMPO ───────────────────────────────────────────
      y = sectionHeader("DATOS DE CAMPO", y, C_GREEN, C_GREEN_L);

      const campos: [string, string][] = [
        ["Ciudad / zona",        data.city],
        ["Dirección / parcela",  data.address],
        ...(data.fieldNotes ? [["Notas de campo", data.fieldNotes] as [string, string]] : []),
        ["Analista",             data.analystUsername],
        ["Fecha",                `${fechaStr} — ${horaStr}`],
      ];

      for (const [label, value] of campos) {
        checkPage(10);
        const labelW = 42;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        rgb(C_GRAY);
        doc.text(label, MARGIN, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        rgb(C_BLACK);
        const lines = doc.splitTextToSize(value, CONT_W - labelW) as string[];
        const lh = 4.8;
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) checkPage(lh + 1);
          doc.text(lines[i], MARGIN + labelW, y);
          y += lh;
        }
        y += 1;
      }
      y += 5;

      // ── IMAGEN ANALIZADA ────────────────────────────────────────────────
      if (data.imageBase64 && data.imageMime) {
        checkPage(30);
        y = sectionHeader("IMAGEN ANALIZADA", y, C_GREEN, C_GREEN_L);

        const imgW = data.imageWidth ?? 400;
        const imgH = data.imageHeight ?? 300;
        const ratio = imgH / imgW;

        // Ancho máximo de la imagen en el PDF
        const maxImgW = CONT_W;
        const maxImgH = 75; // máximo 75mm de alto para no ocupar demasiado
        let pdfW = maxImgW;
        let pdfH = pdfW * ratio;
        if (pdfH > maxImgH) {
          pdfH = maxImgH;
          pdfW = pdfH / ratio;
        }

        // Centrado horizontal
        const imgX = MARGIN + (CONT_W - pdfW) / 2;

        checkPage(pdfH + 8);

        // Marco de la imagen
        strokeRect(imgX - 0.5, y - 0.5, pdfW + 1, pdfH + 1, C_LINE, 0.4);

        const mime = data.imageMime.includes("png") ? "PNG"
          : data.imageMime.includes("webp") ? "WEBP"
          : "JPEG";

        doc.addImage(data.imageBase64, mime, imgX, y, pdfW, pdfH);
        y += pdfH + 3;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        rgb(C_GRAY);
        doc.text("Fotografía enviada para el análisis fitosanitario", MARGIN + CONT_W / 2, y, { align: "center" });
        y += 8;
      }

      // ── RESULTADO ───────────────────────────────────────────────────────
      const result = data.resultJson as AnalysisResult | null;

      if (data.errorMessage && !result) {
        checkPage(20);
        y = sectionHeader("AVISO DEL ANÁLISIS", y, C_RED, C_RED_L);
        y = writeText(data.errorMessage, MARGIN, y, CONT_W, "helvetica", "normal", 9, C_GRAY_D);
        y += 5;
      }

      if (result) {
        // ── Banner diagnóstico principal ─────────────────────────────────
        checkPage(28);
        fillRect(MARGIN, y, CONT_W, 22, C_GREEN, 3);
        fillRect(MARGIN, y, 4, 22, C_GREEN_D, 2);

        if (result.diagnosticoPrincipal) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          rgb(C_WHITE);
          const dlines = doc.splitTextToSize(result.diagnosticoPrincipal, CONT_W - 16) as string[];
          let dy = y + 8;
          for (const dl of dlines) {
            doc.text(dl, MARGIN + 8, dy);
            dy += 5.5;
          }
          y = dy;
        } else {
          y += 8;
        }

        // Severidad y confianza dentro del banner
        const sevText  = result.severidad  ? `Severidad: ${result.severidad}` : "";
        const confText = result.confianza != null ? `Confianza: ${result.confianza}%` : "";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        if (sevText) {
          doc.setTextColor(180, 230, 200);
          doc.text(sevText, MARGIN + 8, y + 2);
        }
        if (confText) {
          doc.setTextColor(180, 230, 200);
          doc.text(confText, PAGE_W - MARGIN - 2, y + 2, { align: "right" });
        }
        y += 9;
        y += 5; // margen debajo del banner

        // ── Pilares ──────────────────────────────────────────────────────
        const pilarDefs = [
          { key: "follaje"   as const, label: "PILAR 1 — ENFERMEDADES DEL FOLLAJE",  c: C_GREEN,  bg: C_GREEN_L },
          { key: "plagas"    as const, label: "PILAR 2 — PLAGAS Y DAÑOS FÍSICOS",     c: C_AMBER,  bg: C_AMBER_L },
          { key: "nutricion" as const, label: "PILAR 3 — ESTADO NUTRICIONAL",         c: [24,95,165] as [number,number,number], bg: [235,245,251] as [number,number,number] },
        ];

        for (const { key, label, c, bg } of pilarDefs) {
          const pilar = result.pilares?.[key];
          if (!pilar) continue;
          checkPage(16);

          y = sectionHeader(label, y, c, bg);

          if (pilar.sinHallazgos) {
            checkPage(8);
            fillRect(MARGIN, y, CONT_W, 7, C_GREEN_L, 2);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            rgb(C_GREEN);
            doc.text(`Sin hallazgos patológicos. ${pilar.nota ?? ""}`, MARGIN + 4, y + 4.8);
            y += 10;
          } else {
            for (const h of pilar.hallazgos ?? []) {
              checkPage(22);

              // Card de hallazgo con fondo suave
              const startY = y;
              // Nombre + científico
              const title = h.nombreCientifico
                ? `${h.nombre ?? ""}  (${h.nombreCientifico})`
                : (h.nombre ?? "");
              y = writeText(title, MARGIN + 2, y, CONT_W - 4, "helvetica", "bold", 9, C_BLACK, 1.55);

              // Badges severidad / confianza en línea
              if (h.severidad || h.confianza) {
                checkPage(6);
                let bx = MARGIN + 2;
                if (h.severidad) {
                  const bw = doc.getTextWidth(h.severidad) + 6;
                  fillRect(bx, y, bw, 5, C_AMBER_L, 2);
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(7.5);
                  rgb(C_AMBER);
                  doc.text(h.severidad, bx + 3, y + 3.6);
                  bx += bw + 3;
                }
                if (h.confianza) {
                  const bw = doc.getTextWidth(h.confianza) + 6;
                  fillRect(bx, y, bw, 5, C_GRAY_L, 2);
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(7.5);
                  rgb(C_GRAY);
                  doc.text(h.confianza, bx + 3, y + 3.6);
                }
                y += 7;
              }

              if (h.descripcion) {
                checkPage(8);
                y = writeText(h.descripcion, MARGIN + 2, y, CONT_W - 4, "helvetica", "normal", 8, C_GRAY_D, 1.5);
              }

              if (h.productoRecomendado) {
                checkPage(8);
                const prod = [
                  `Producto: ${h.productoRecomendado}`,
                  h.modoAplicacion  ? h.modoAplicacion  : "",
                  h.periodoCarencia ? `Carencia: ${h.periodoCarencia}` : "",
                ].filter(Boolean).join("  ·  ");
                y = writeText(prod, MARGIN + 2, y, CONT_W - 4, "helvetica", "italic", 8, C_GREEN, 1.5);
              }

              // Línea separadora entre hallazgos
              if (h !== (pilar.hallazgos ?? []).at(-1)) {
                checkPage(4);
                hLine(y + 1, C_LINE, 0.2);
                y += 4;
              } else {
                // Borde del card desde startY hasta y
                strokeRect(MARGIN, startY - 4, CONT_W, y - startY + 6, C_LINE, 0.25);
                y += 4;
              }
            }
            if (pilar.nota) {
              checkPage(8);
              y = writeText(pilar.nota, MARGIN + 2, y, CONT_W - 4, "helvetica", "italic", 8, C_GRAY, 1.5);
              y += 2;
            }
          }
          y += 3;
        }

        // ── Diagnóstico integrado ─────────────────────────────────────────
        if (result.diagnosticoIntegrado) {
          checkPage(20);
          y = sectionHeader("DIAGNÓSTICO INTEGRADO", y, C_GREEN, C_GREEN_L);
          y = writeText(result.diagnosticoIntegrado, MARGIN, y, CONT_W, "helvetica", "normal", 9, C_GRAY_D, 1.55);
          y += 5;
        }

        // ── Acción urgente ────────────────────────────────────────────────
        if (result.accionUrgente) {
          checkPage(18);
          fillRect(MARGIN, y, CONT_W, 7, C_RED_L, 3);
          fillRect(MARGIN, y, 4, 7, C_RED, 2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          rgb(C_RED);
          doc.text("ACCIÓN URGENTE", MARGIN + 6, y + 4.8);
          y += 10;
          y = writeText(result.accionUrgente, MARGIN, y, CONT_W, "helvetica", "bold", 9, C_RED, 1.5);
          y += 5;
        }

        // ── Plan de acción ────────────────────────────────────────────────
        if (result.planAccion && result.planAccion.length > 0) {
          checkPage(20);
          y = sectionHeader("PLAN DE ACCIÓN RECOMENDADO", y, C_GREEN, C_GREEN_L);

          for (const item of result.planAccion) {
            checkPage(24);

            const priColor: [number,number,number] =
              item.prioridad === "p1" ? C_RED :
              item.prioridad === "p2" ? C_AMBER :
              item.prioridad === "p3" ? [24,95,165] :
              C_GREEN;

            const priLabel = (item.prioridad ?? "").toUpperCase();

            // Pill de prioridad
            const pillW = 12;
            fillRect(MARGIN, y, pillW, 6, priColor, 2);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            rgb(C_WHITE);
            doc.text(priLabel, MARGIN + pillW / 2, y + 4, { align: "center" });

            // Contenido a la derecha del pill
            const cx = MARGIN + pillW + 4;
            const cw = CONT_W - pillW - 4;

            if (item.titulo) {
              const tlines = doc.splitTextToSize(item.titulo, cw) as string[];
              doc.setFont("helvetica", "bold");
              doc.setFontSize(9);
              rgb(C_BLACK);
              let ty = y + 4.5;
              for (const tl of tlines) {
                doc.text(tl, cx, ty);
                ty += 4.5;
              }
              y = ty;
            } else {
              y += 6;
            }

            if (item.detalle) {
              y = writeText(item.detalle, cx, y, cw, "helvetica", "normal", 8, C_GRAY_D, 1.5);
            }
            if (item.plazo) {
              y = writeText(`Plazo: ${item.plazo}`, cx, y, cw, "helvetica", "italic", 8, C_AMBER, 1.4);
            }

            // Separador
            hLine(y + 1.5, C_LINE, 0.2);
            y += 5;
          }
        }

        // ── Disclaimer ────────────────────────────────────────────────────
        if (result.disclaimer) {
          checkPage(20);
          y += 4;
          fillRect(MARGIN, y, CONT_W, 2, C_LINE, 0);
          y += 5;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7.5);
          rgb(C_GRAY);
          const dtext = `Aviso legal: ${result.disclaimer}`;
          y = writeText(dtext, MARGIN, y, CONT_W, "helvetica", "italic", 7.5, C_GRAY, 1.5);
          y += 3;
        }
      }

      // ── FOOTERS en todas las páginas ─────────────────────────────────────
      const totalPg = doc.getNumberOfPages();
      for (let p = 1; p <= totalPg; p++) {
        doc.setPage(p);
        drawFooter();
      }

      // ── Guardar ───────────────────────────────────────────────────────────
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
