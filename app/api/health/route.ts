import { NextResponse } from "next/server";

/** Comprobación ligera sin base de datos (útil en despliegue). */
export function GET() {
  return NextResponse.json({
    ok: true,
    app: "ecuagro-web",
    phase: 3,
  });
}
