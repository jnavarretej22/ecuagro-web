import { redirect } from "next/navigation";

/** Compatibilidad: el login de revisor sigue enviando a `/revisor`. */
export default function RevisorRedirectPage() {
  redirect("/revision/analisis");
}
