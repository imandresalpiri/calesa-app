'use client'

import type { Envoltorios, PropsDelCuerpo } from './cuerpo'
import type { CasillasDelEditor, FijosDelEditor } from './tipos'

type Props = Pick<
  PropsDelCuerpo,
  'puedeGestionar' | 'motivoSinPermiso' | 'conAsa' | 'alAlternarFijo'
> & {
  fijos: FijosDelEditor
  casillas: CasillasDelEditor
  envoltorios: Envoltorios
}

// Las filas fijas (en un origen, «Comunes»): lo que puede ir a una casilla sin ser un campo del layout.
export function FilasFijas(props: Props) {
  const { fijos, casillas, puedeGestionar, motivoSinPermiso, conAsa, alAlternarFijo } = props
  const { Fijo } = props.envoltorios
  const enCasillas = new Set(casillas.lista.map((casilla) => casilla.llave))
  const { insignia, hacer, quitar, motivoTope, notaAlDesactivar, zona } = casillas
  const textos = { insignia, hacer, quitar, motivoTope, notaAlDesactivar, zona }
  const topeLleno = casillas.lista.length >= casillas.tope
  if (fijos.filas.length === 0) {
    return null
  }
  return (
    <div className="grid gap-2">
      <h3 className="text-(length:--text-sm) font-medium text-(--color-ink-soft)">
        {fijos.titulo}
      </h3>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 @min-[36rem]/campos:grid-cols-2 @min-[64rem]/campos:grid-cols-3">
        {fijos.filas.map((fila) => (
          <Fijo
            key={fila.llave}
            llave={fila.llave}
            etiqueta={fila.etiqueta}
            insignia={fijos.insignia}
            textos={textos}
            es={enCasillas.has(fila.llave)}
            topeLleno={topeLleno}
            puedeGestionar={puedeGestionar}
            motivoSinPermiso={motivoSinPermiso}
            conAsa={conAsa}
            alAlternar={alAlternarFijo}
          />
        ))}
      </ul>
    </div>
  )
}
