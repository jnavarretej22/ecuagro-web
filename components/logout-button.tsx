"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { className?: string };

export default function LogoutButton({ className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void logout()}
      disabled={busy}
    >
      {busy ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
