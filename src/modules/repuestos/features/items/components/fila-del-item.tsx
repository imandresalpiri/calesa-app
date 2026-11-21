'use client'

import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { COLUMNAS_DE_LA_FILA, claseDe, type ClaveDeColumna } from './columnas-de-la-hoja'
import { controlesDeItem } from './controles-de-item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { paradaTrasLaFlecha, type TipoDeParada } from './flechas-de-la-fila'

const PARADAS =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), button[data-parada="0"]'

function tipoDe(el: HTMLElement): TipoDeParada {
  if (el instanceof HTMLSelectElement) return 'seleccion'
  return el instanceof HTMLInputElement ? 'texto' : 'valor'
}

// ¿El valor de una `XCell` tiene otra parada (sus acciones) en ese sentido? Sin ayuda ni ⚙, sólo ↺ cuando está modificado, y aquí nunca lo está.
function tieneOtraParada(el: HTMLElement, tecla: string): boolean {
  const paradas = [
    ...(el.closest('[data-estado]')?.querySelectorAll<HTMLElement>('[data-parada]') ?? []),
  ]
  const paso = tecla === 'ArrowRight' ? 1 : -1
  const actual = paradas.indexOf(el)
  return actual >= 0 && paradas[actual + paso] !== undefined
}

// Lo que `paradaTrasLaFlecha` necesita saber de la parada que tiene el foco: su tipo y, si es un texto, dónde está el cursor.
function datosDeLaParada(el: HTMLElement, tecla: string) {
  const tipo = tipoDe(el)
  const texto = el instanceof HTMLInputElement ? el : null
  return {
    tipo,
    inicio: texto?.selectionStart ?? 0,
    fin: texto?.selectionEnd ?? 0,
    largo: texto?.value.length ?? 0,
    otraParadaEnLaCelda: tipo === 'valor' && tieneOtraParada(el, tecla),
  }
}

// ← y → pasan a la celda vecina de la misma fila cuando la flecha no es de la celda (`paradaTrasLaFlecha`); Tab sigue el orden natural.
function alTeclear(evento: KeyboardEvent<HTMLTableRowElement>) {
  const el = evento.target
  if (!(el instanceof HTMLElement)) return
  const paradas = [...evento.currentTarget.querySelectorAll<HTMLElement>(PARADAS)]
  const indice = paradas.indexOf(el)
  if (indice < 0) return
  const destino = paradaTrasLaFlecha({
    tecla: evento.key,
    indice,
    total: paradas.length,
    ...datosDeLaParada(el, evento.key),
  })
  if (destino === null) return
  evento.preventDefault()
  paradas[destino]?.focus()
}

// La tabla de la fila del ítem: los encabezados de las columnas y, debajo, una o más `<FilaDelItem>`. Se desplaza de costado en todo ancho (`w-max min-w-full`): en el celular sigue
// siendo horizontal, como una hoja de cálculo, con su pista de que queda algo escondido.
export function TablaDeLaFila({ children }: { children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(caja)
  return (
    <div className="relative min-w-0">
      <div ref={caja} className="overflow-x-auto">
        <table className="w-max min-w-full text-(length:--text-sm)">
          <thead>
            <tr className="border-b border-(--color-line)">
              {COLUMNAS_DE_LA_FILA.map((columna) => (
                <th
                  key={columna.clave}
                  scope="col"
                  title={columna.ayuda}
                  className={`px-2 py-1.5 text-left text-(length:--text-xs) font-medium text-(--color-ink-soft) ${columna.clase}`}
                >
                  {columna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <PistaDeDesborde {...desborde} />
    </div>
  )
}

// Una celda de la fila: arriba, alineada con el borde; los números a la derecha, como en la hoja.
export function CeldaDeLaFila({ clave, children }: { clave: ClaveDeColumna; children: ReactNode }) {
  return <td className={`px-2 py-1.5 align-top ${claseDe(clave)}`}>{children}</td>
}

// El ítem como una fila de Excel (glosario: «Fila del ítem»): Ítem · Cantidad · Precio al cliente · País de origen · Vía de transporte · Moneda · Tracking · Notas, cada celda editable como en la hoja (Enter
// o al salir guarda; Esc vuelve). Va dentro de una `<TablaDeLaFila>`. `data-fila-de-item`: Enter baja a la fila de abajo (la lista de «Agregar ítems»).
export function FilaDelItem({ fila, contexto }: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) {
  const c = controlesDeItem(fila, contexto)
  return (
    <tr
      data-fila-de-item={fila.id}
      className="border-b border-(--color-line)"
      onKeyDown={alTeclear}
    >
      <CeldaDeLaFila clave="item">{c.item}</CeldaDeLaFila>
      <CeldaDeLaFila clave="cantidad">
        <span className="tabular-nums">{c.cantidad}</span>
      </CeldaDeLaFila>
      <CeldaDeLaFila clave="precio">{c.precio}</CeldaDeLaFila>
      <CeldaDeLaFila clave="pais">{c.pais}</CeldaDeLaFila>
      <CeldaDeLaFila clave="via">{c.via}</CeldaDeLaFila>
      <CeldaDeLaFila clave="moneda">{c.moneda}</CeldaDeLaFila>
      <CeldaDeLaFila clave="tracking">{c.tracking}</CeldaDeLaFila>
      <CeldaDeLaFila clave="notas">{c.notas}</CeldaDeLaFila>
    </tr>
  )
}
