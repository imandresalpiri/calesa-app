'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Checkbox } from '@/shared/ui/checkbox'
import type { ColumnaDelCatalogo } from '../../../../../entities/catalogo-de-tablas'
import {
  columnasMostradas,
  type BloqueDeTabla,
  type CeldaQueAceptaValor,
} from '../../../../../entities/diseno/tabla-del-bloque'

type Props = {
  nombre: string
  bloque: BloqueDeTabla
  // Las columnas de la tabla en el catálogo, en su orden.
  columnas: readonly ColumnaDelCatalogo[]
  celdas: readonly CeldaQueAceptaValor[]
  ocupado: boolean
  alMostrar: (columna: string, mostrar: boolean) => void
  alLlenar: (columna: string, llena: string | null) => void
}

export const AL_MENOS_UNA_COLUMNA = 'Muestra al menos una columna.'
export const COLUMNA_QUE_FALTA = 'Esa columna ya no está en la tabla.'
export const CELDA_QUE_NO_ACEPTA = 'Esa celda no acepta un valor en la hoja.'

type Fila = { clave: string; etiqueta: string; enLaTabla: boolean }

// «Llena la celda» de una columna que se muestra: «Ninguna» o una celda que la hoja deja escribir. Una que ya no acepta un valor se ve, con su error.
function LlenaLaCelda({
  nombre,
  fila,
  llena,
  celdas,
  ocupado,
  alLlenar,
}: Pick<Props, 'nombre' | 'celdas' | 'ocupado' | 'alLlenar'> & {
  fila: Fila
  llena: string | undefined
}) {
  // La celda que llena y ya no acepta un valor (se quitó del diseño o cambió de tipo).
  const ajena = llena !== undefined && !celdas.some((c) => c.nodo === llena) ? llena : null
  return (
    <CampoSeleccion
      nombre={`${nombre}-${fila.clave}-llena`}
      etiqueta={`«${fila.etiqueta}» llena la celda`}
      value={llena ?? ''}
      disabled={ocupado}
      opciones={[
        { valor: '', etiqueta: 'Ninguna' },
        ...celdas.map((c) => ({ valor: c.nodo, etiqueta: c.rotulo })),
        ...(ajena === null ? [] : [{ valor: ajena, etiqueta: ajena }]),
      ]}
      {...(ajena === null ? {} : { error: CELDA_QUE_NO_ACEPTA })}
      onChange={(e) => {
        alLlenar(fila.clave, e.target.value === '' ? null : e.target.value)
      }}
    />
  )
}

// Las columnas de un bloque de tabla: una casilla «Mostrar» por columna de la tabla (la última que queda no se apaga) y, en las que se muestran, «Llena la
// celda». Una columna que el bloque nombra y la tabla ya no tiene se ve al final, marcada: apagarla la quita.
export function ColumnasDelBloque(props: Props) {
  const { nombre, bloque, columnas, ocupado, alMostrar } = props
  const todas = columnas.map((c) => c.clave)
  const mostradas = columnasMostradas(bloque, todas)
  const filas: Fila[] = [
    ...columnas.map((c) => ({ clave: c.clave, etiqueta: c.etiqueta, enLaTabla: true })),
    ...mostradas
      .filter((m) => !todas.includes(m.columna))
      .map((m) => ({ clave: m.columna, etiqueta: m.columna, enLaTabla: false })),
  ]
  const unaSola = mostradas.length === 1
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="text-(length:--text-sm) font-medium text-(--color-ink)">Columnas</legend>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {filas.map((fila) => {
          const mostrada = mostradas.find((m) => m.columna === fila.clave)
          const id = `${nombre}-${fila.clave}`
          return (
            <li
              key={fila.clave}
              data-columna-de-la-ayuda={fila.clave}
              className="grid min-w-0 gap-1.5"
            >
              <label className="flex min-h-11 min-w-0 items-center gap-2 text-(length:--text-sm) break-words text-(--color-ink) md:min-h-8">
                <Checkbox
                  aria-label={`Mostrar «${fila.etiqueta}»`}
                  aria-describedby={fila.enLaTabla ? undefined : `${id}-falta`}
                  checked={mostrada !== undefined}
                  disabled={ocupado || (unaSola && mostrada !== undefined)}
                  onCheckedChange={(marcada) => {
                    alMostrar(fila.clave, marcada)
                  }}
                />
                {`Mostrar «${fila.etiqueta}»`}
              </label>
              {fila.enLaTabla ? null : (
                <p
                  id={`${id}-falta`}
                  className="text-(length:--text-sm) text-(--color-peligro-ink)"
                >
                  {COLUMNA_QUE_FALTA}
                </p>
              )}
              {mostrada === undefined ? null : (
                <LlenaLaCelda {...props} fila={fila} llena={mostrada.llena} />
              )}
            </li>
          )
        })}
      </ul>
      {unaSola ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{AL_MENOS_UNA_COLUMNA}</p>
      ) : null}
    </fieldset>
  )
}
