'use client'

import { Settings2 } from 'lucide-react'
import {
  cabeceraSeDibuja,
  modoInicial,
  modosDelEncabezado,
  ofreceVerTotalBs,
  verTotalBsAlAbrir,
} from '../../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../../entities/hoja'
import { claseDeLaCabecera } from '../clases-de-la-rejilla'
import { PiezasDeLaCabecera } from '../piezas-de-la-cabecera'

const NADA = () => undefined

// La cabecera de la hoja tal como se va a ver, quieta (`inert`), para que la ranura la muestre antes de que la hoja se hidrate y ponga la suya por el portal: miden lo mismo
// porque se dibujan con las mismas piezas, así la fila de las barras no salta (un alto reservado no alcanza: en el celular la cabecera se parte en dos líneas o no según el
// ancho y el texto). Sin modos que elegir, «Ver total» ni ⚙, nada. Abre con el modo y «Ver total» de una cotización nueva salvo que la página diga los de la guardada.
export function CabeceraQuieta({
  cabecera,
  modoElegido = modoInicial(cabecera),
  verTotalBs = verTotalBsAlAbrir(cabecera),
  deshabilitado = false,
}: {
  cabecera: HojaLista['cabecera']
  modoElegido?: string | null
  verTotalBs?: boolean
  deshabilitado?: boolean
}) {
  if (!cabeceraSeDibuja(cabecera, modoElegido)) {
    return null
  }
  const modos = modosDelEncabezado(cabecera, modoElegido)
  return (
    <div data-tono={cabecera.tono} className={claseDeLaCabecera(cabecera)}>
      <PiezasDeLaCabecera
        modos={modos}
        modoElegido={modoElegido}
        alElegirModo={NADA}
        verTotalBs={ofreceVerTotalBs(cabecera) ? verTotalBs : null}
        alCambiarVerTotalBs={NADA}
        deshabilitado={deshabilitado}
      />
      {cabecera.ajustes ? (
        <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-(--color-ink-soft) md:pointer-fine:min-h-9 md:pointer-fine:min-w-9">
          <Settings2 aria-hidden className="size-[1.125rem]" />
        </span>
      ) : null}
    </div>
  )
}
