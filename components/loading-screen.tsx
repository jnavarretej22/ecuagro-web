"use client";

import { useEffect, useState } from "react";
import styles from "./loading-screen.module.css";

const STEPS = [
  { emoji: "🦠", label: "Enfermedades del follaje" },
  { emoji: "🐛", label: "Plagas y daños físicos" },
  { emoji: "🌿", label: "Estado nutricional" },
  { emoji: "🔗", label: "Correlación e integración" },
];

// Duración aproximada de cada paso (ms). El último permanece hasta que llega la respuesta.
const STEP_DURATIONS = [2500, 2500, 2500, 99999];

type StepState = "pending" | "active" | "done";

export default function LoadingScreen() {
  const [stepStates, setStepStates] = useState<StepState[]>([
    "active", "pending", "pending", "pending",
  ]);
  const [subText, setSubText] = useState("Conectando con el motor de IA…");

  useEffect(() => {
    const subs = [
      "Procesando imagen con IA…",
      "Evaluando plagas y daños…",
      "Analizando nutrición foliar…",
      "Sintetizando diagnóstico integrado…",
    ];
    let currentStep = 0;

    function advance() {
      if (currentStep >= STEPS.length - 1) return;
      setStepStates((prev) => {
        const next = [...prev] as StepState[];
        next[currentStep] = "done";
        next[currentStep + 1] = "active";
        return next;
      });
      currentStep++;
      setSubText(subs[currentStep]);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 0; i < STEPS.length - 1; i++) {
      elapsed += STEP_DURATIONS[i];
      timers.push(setTimeout(advance, elapsed));
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={styles.stage}>
      {/* Scan line en el top */}
      <div className={styles.scanLine} aria-hidden />

      {/* Spinner doble */}
      <div className={styles.spinner} aria-hidden>
        <div className={styles.spinnerRing} />
        <div className={`${styles.spinnerRing} ${styles.spinnerRingInner}`} />
      </div>

      <h2 className={styles.title}>Analizando tu cultivo</h2>
      <p className={styles.sub}>{subText}</p>

      {/* Pillar steps */}
      <div className={styles.steps} role="status" aria-live="polite" aria-label="Progreso del análisis">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`${styles.step} ${styles[stepStates[i]]}`}
          >
            <div className={`${styles.stepIcon} ${styles[stepStates[i]]}`} aria-hidden>
              {stepStates[i] === "done" ? "✓" : step.emoji}
            </div>
            <div className={`${styles.stepText} ${stepStates[i] === "done" ? styles.stepTextDone : ""}`}>
              Pilar {i + 1} — {step.label}
            </div>
          </div>
        ))}
      </div>

      {/* Indicador de proveedor */}
      <div className={styles.providerBadge} aria-hidden>
        <span className={styles.providerDot} />
        <span>Analizando con motor IA Groq…</span>
      </div>
    </div>
  );
}
