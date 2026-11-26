'use client'

import { useId, useRef, useState } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import {
  motivoDeLaColumna,
  type ColumnaDeComparar,
  type FilaDeComparar,
  type ModeloDeComparar,
} from '../../../../entities/aprobada/comparar'
import type { AprobarEn } from '../../../../entities/aprobada/de-este-vehiculo'
import { useAprobarEsta } from '../../hooks/use-aprobar-esta'
import { DialogoDeAprobarPrivada } from '../aprobar-privada/dialogo-de-aprobar-privada'
import { CabeceraDeColumna } from './cabecera-de-columna'
import { CeldaComparada } from './celda-comparada'
import { ColumnaConError } from './columna-con-error'
import { PieDeColumna } from './pie-de-columna'

type Props = {
  modelo: ModeloDeComparar
  // Dónde aprueba quien mira (`origenesCon(permisos, 'cotizaciones.aprobar')`, del servidor).
  aprobarEn: AprobarEn
}

// La columna de las etiquetas queda fija al desplazar de costado; su ancho, en rem y a lo sumo el 35 % de la tabla (en el celular asoma la segunda columna).
const ETIQUETA =
  'sticky left-0 z-10 min-w-32 max-w-[35cqw] bg-(--color-surface) px-3 py-2 text-left align-top font-normal [overflow-wrap:anywhere]'
const COLUMNA = 'min-w-40 max-w-72 px-3 py-3 align-top'

// «Comparar cotizaciones»: una columna por cotización con su cabecera, una fila por sección y por nodo (alineadas por el servidor, `compararCotizaciones`) y, al pie,
// «Aprobar esta» y «Abrir». La tabla se desplaza de costado dentro de su caja (la página no desborda) con la pista de desborde. Aprobar mueve la insignia sin recargar:
// la aprobada vive aquí, iniciada con la del servidor (la `key` de la página la reinicia al releer). «Deshacer» la devuelve.
export function TablaDeComparar({ modelo, aprobarEn }: Props) {
  const [aprobadaId, setAprobadaId] = useState(modelo.aprobadaId)
  const { enCurso, aprobar, pedidoDe } = useAprobarEsta(
    modelo.vehiculoId,
    useId(),
    setAprobadaId,
    'comparar',
  )
  const caja = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(caja)
  const titulo = useId()
  return (
    <div className="@container relative min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface)">
      <div
        ref={caja}
        role="region"
        aria-labelledby={titulo}
        // La caja se desplaza: con teclado se llega a ella. `relative`: los `sr-only` de las celdas (absolutos) se ubican en ella y no ensanchan la página.
        tabIndex={0}
        className="relative overflow-x-auto rounded-(--radius-md) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none"
      >
        <table
          data-tabla-de-comparar=""
          className="w-max min-w-full border-separate border-spacing-0 text-(length:--text-sm)"
        >
          <caption id={titulo} className="sr-only">
            Comparación de cotizaciones
          </caption>
          <thead>
            <tr>
              <td className={ETIQUETA} />
              {modelo.columnas.map((columna) => (
                <th
                  key={columna.id}
                  scope="col"
                  data-columna={columna.id}
                  data-aprobada={columna.id === aprobadaId ? '' : undefined}
                  className={COLUMNA}
                >
                  {columna.tipo === 'error' ? (
                    <ColumnaConError numero={columna.numero} />
                  ) : (
                    <CabeceraDeColumna columna={columna} aprobada={columna.id === aprobadaId} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelo.filas.map((fila) => (
              <FilaDeLaTabla
                key={fila.tipo === 'seccion' ? `s:${fila.id}` : fila.nodo}
                fila={fila}
                columnas={modelo.columnas}
              />
            ))}
          </tbody>
          <PieDeLaTabla
            columnas={modelo.columnas}
            aprobadaId={aprobadaId}
            aprobarEn={aprobarEn}
            enCurso={enCurso}
            alAprobar={aprobar}
          />
        </table>
      </div>
      <PistaDeDesborde {...desborde} />
      <DialogoDeAprobarPrivada
        desde="comparar"
        de={(id) => {
          const columna = modelo.columnas.find((c) => c.id === id)
          return columna === undefined || columna.tipo === 'error' ? null : pedidoDe(columna)
        }}
      />
    </div>
  )
}

// Al pie, «Aprobar esta» y «Abrir» de cada columna.
function PieDeLaTabla({
  columnas,
  aprobadaId,
  ...pie
}: {
  columnas: ModeloDeComparar['columnas']
  aprobadaId: string | null
  aprobarEn: AprobarEn
  enCurso: string | null
  alAprobar: ReturnType<typeof useAprobarEsta>['aprobar']
}) {
  return (
    <tfoot>
      <tr>
        <th scope="row" className={`${ETIQUETA} border-t border-(--color-line)`}>
          <span className="sr-only">Acciones</span>
        </th>
        {columnas.map((columna) => (
          <td key={columna.id} className={`${COLUMNA} border-t border-(--color-line)`}>
            <Pie columna={columna} aprobada={columna.id === aprobadaId} {...pie} />
          </td>
        ))}
      </tr>
    </tfoot>
  )
}

// Una fila: el encabezado de una sección (a lo ancho, con su rótulo fijo a la izquierda) o un nodo con una celda por columna.
function FilaDeLaTabla({
  fila,
  columnas,
}: {
  fila: FilaDeComparar
  columnas: readonly ColumnaDeComparar[]
}) {
  if (fila.tipo === 'seccion') {
    return (
      <tr data-seccion-comparada={fila.id}>
        <th
          scope="colgroup"
          colSpan={columnas.length + 1}
          className="border-t border-(--color-line) bg-(--color-paper) px-3 py-2 text-left font-semibold text-(--color-ink)"
        >
          <span className="sticky left-3 inline-block">{fila.rotulo}</span>
        </th>
      </tr>
    )
  }
  return (
    <tr data-fila-comparada={fila.nodo}>
      <th
        scope="row"
        className={`${ETIQUETA} border-t border-(--color-line) text-(--color-ink-soft)`}
      >
        {fila.rotulo}
      </th>
      {columnas.map((columna, i) => (
        <CeldaComparada
          key={columna.id}
          celda={fila.celdas[i] ?? { tipo: 'error' }}
          formato={fila.formato}
          decimales={fila.decimales}
          nodo={fila.nodo}
          columna={columna.id}
        />
      ))}
    </tr>
  )
}

function Pie({
  columna,
  aprobada,
  aprobarEn,
  enCurso,
  alAprobar,
}: {
  columna: ColumnaDeComparar
  aprobada: boolean
  aprobarEn: AprobarEn
  enCurso: string | null
  alAprobar: ReturnType<typeof useAprobarEsta>['aprobar']
}) {
  if (columna.tipo === 'error') {
    return null
  }
  return (
    <PieDeColumna
      id={columna.id}
      numero={columna.numero}
      aprobada={aprobada}
      motivo={motivoDeLaColumna(columna, aprobarEn)}
      aprobando={enCurso === columna.id}
      ocupado={enCurso !== null}
      alAprobar={() => {
        alAprobar(columna)
      }}
    />
  )
}
