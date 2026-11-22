'use client'

import { useId, useState } from 'react'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { CatalogoDeTablas } from '../../../../../entities/compilador'
import type { PedidoDeTipo } from '../../../../../entities/formula/tipo-de-celda'
import { camposDelVehiculo, nombreDelCampo } from './campos-del-vehiculo'
import { MarcoDelTipo } from './marco-del-tipo'

export type TablaElegida = {
  readonly tabla: string
  readonly columna: string
  readonly match: Readonly<Record<string, string>>
}

type FilaAnterior = { readonly id: string; readonly numero: number; readonly etiqueta: string }

type Props = {
  tablas: CatalogoDeTablas
  nombreDelOrigen: string
  // Las filas de arriba: lo que una columna puede casar (un nodo anterior o, si no, un dato del vehículo).
  anteriores: readonly FilaAnterior[]
  inicial: TablaElegida
  motivo: string | null
  alAplicar: (pedido: PedidoDeTipo) => void
  alCancelar: () => void
}

// Con qué se compara cada columna: una fila de arriba o un dato del vehículo (un dato con el id de una fila es la fila). Lo que ya casaba y no está, igual.
function opcionesDeCasar(anteriores: readonly FilaAnterior[], casados: readonly string[]) {
  const ids = new Set(anteriores.map((f) => f.id))
  const campos = camposDelVehiculo(casados.filter((c) => !ids.has(c))).filter((c) => !ids.has(c))
  return [
    { valor: '', etiqueta: 'No se compara' },
    ...anteriores.map((f) => ({ valor: f.id, etiqueta: `C${String(f.numero)} · ${f.etiqueta}` })),
    ...campos.map((c) => ({ valor: c, etiqueta: `Vehículo: ${nombreDelCampo(c)}` })),
  ]
}

const pedidoDe = (e: TablaElegida, columnas: readonly string[]): PedidoDeTipo => ({
  tipo: 'de_una_tabla',
  tabla: e.tabla,
  columna: e.columna,
  match: Object.fromEntries(
    Object.entries(e.match).filter(([k, v]) => v !== '' && k !== e.columna && columnas.includes(k)),
  ),
})

// «Tipo de celda › De una tabla» (BUSCARV sin escribirlo): la tabla del origen o compartida, la columna que da el valor y con qué se compara cada otra columna.
export function FormularioDeLaTabla(p: Props) {
  const uid = useId()
  const [e, setE] = useState(p.inicial)
  const columnas = p.tablas?.find((t) => t.clave === e.tabla)?.columnas ?? []
  const casar = opcionesDeCasar(p.anteriores, Object.values(e.match))
  const conColumnas = (lista: readonly string[]) => [
    { valor: '', etiqueta: 'Elige una', deshabilitada: true },
    ...lista.map((c) => ({ valor: c, etiqueta: c })),
  ]
  return (
    <MarcoDelTipo
      hayCambios={JSON.stringify(e) !== JSON.stringify(p.inicial)}
      motivo={
        p.tablas === null
          ? `No se pudo leer el catálogo de tablas de ${p.nombreDelOrigen}.`
          : p.motivo
      }
      listo={p.tablas !== null && e.tabla !== '' && e.columna !== ''}
      alEnviar={() => {
        p.alAplicar(pedidoDe(e, columnas))
      }}
      alCancelar={p.alCancelar}
    >
      <CampoSeleccion
        nombre={`${uid}-tabla`}
        etiqueta="Tabla"
        ayuda={
          p.tablas?.length === 0
            ? 'Este origen aún no tiene tablas: se crean en «Tablas», en la barra de la fórmula.'
            : undefined
        }
        opciones={conColumnas((p.tablas ?? []).map((t) => t.clave))}
        value={e.tabla}
        onChange={(ev) => {
          setE({ tabla: ev.target.value, columna: '', match: {} })
        }}
      />
      {e.tabla === '' ? null : (
        <CampoSeleccion
          nombre={`${uid}-columna`}
          etiqueta="Columna que da el valor"
          opciones={conColumnas(columnas)}
          value={e.columna}
          onChange={(ev) => {
            setE({ ...e, columna: ev.target.value })
          }}
        />
      )}
      {columnas
        .filter((c) => c !== e.columna && e.columna !== '')
        .map((c) => (
          <CampoSeleccion
            key={c}
            nombre={`${uid}-casa-${c}`}
            etiqueta={`«${c}» se compara con`}
            opciones={casar}
            value={e.match[c] ?? ''}
            onChange={(ev) => {
              setE({ ...e, match: { ...e.match, [c]: ev.target.value } })
            }}
          />
        ))}
    </MarcoDelTipo>
  )
}
