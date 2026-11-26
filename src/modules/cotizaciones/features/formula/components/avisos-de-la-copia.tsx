'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { consultaDelDrawerDeLasTablas, rutaDeLaFormula } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import {
  avisosGuardados,
  claveDeLosAvisos,
  textosDeLosAvisos,
} from '../../../entities/avisos-de-la-copia'

// Quien oye `ocultar()`: el único cambio de esa clave mientras la planilla está abierta.
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function leer(clave: string): string | null {
  try {
    return window.sessionStorage.getItem(clave)
  } catch {
    // Sin `sessionStorage` (modo privado estricto): sin avisos.
    return null
  }
}

function ocultar(clave: string) {
  try {
    window.sessionStorage.removeItem(clave)
  } catch {
    // Sin `sessionStorage`: no había nada guardado.
  }
  for (const oyente of oyentes) oyente()
}

// Los avisos de la copia (docs/GLOSARIO.md) de una fórmula recién copiada de otro origen, arriba de su planilla: los guardó «Nueva fórmula» en `sessionStorage`
// (`claveDeLosAvisos(id)`) y se leen con `useSyncExternalStore` (al hidratar, nada: el servidor no tiene `sessionStorage`). Siguen ahí al recargar la pestaña; «Ocultar» los borra. Los de tablas
// abren el drawer «Tablas» sobre la planilla de esa fórmula. Los datos del vehículo que faltan quedan además marcados en sus filas (`useCamposDeLaFormula()`).
export function AvisosDeLaCopia({
  origenId,
  formulaDelOrigenId,
}: {
  origenId: string
  formulaDelOrigenId: string
}) {
  const clave = claveDeLosAvisos(formulaDelOrigenId)
  const guardado = useSyncExternalStore(
    suscribir,
    () => leer(clave),
    () => null,
  )
  const textos = useMemo(() => textosDeLosAvisos(avisosGuardados(guardado)), [guardado])
  if (textos.length === 0) return null
  const conTablas = textos.some((t) => t.tablas)
  return (
    <Aviso tono="aviso">
      <div data-avisos-de-la-copia className="grid gap-2">
        <p className="font-semibold">Lo que cambió al copiar la fórmula</p>
        <ul className="grid list-disc gap-1 pl-5">
          {textos.map((t) => (
            <li key={t.clave}>{t.texto}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {conTablas ? (
            <Link
              href={rutaDeLaFormula(
                origenId,
                formulaDelOrigenId,
                'planilla',
                consultaDelDrawerDeLasTablas(),
              )}
              className="inline-flex min-h-11 items-center underline md:min-h-8"
            >
              Abrir Tablas
            </Link>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 md:min-h-8"
            onClick={() => {
              ocultar(clave)
            }}
          >
            Ocultar
          </Button>
        </div>
      </div>
    </Aviso>
  )
}
