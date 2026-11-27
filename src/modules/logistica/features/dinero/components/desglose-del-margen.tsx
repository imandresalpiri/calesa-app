'use client'

import { useId } from 'react'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { Modal } from '@/shared/ui/modal'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  QUE_ES_LA_CIFRA,
  SIN_GASTOS_REGISTRADOS,
  textosDelMargen,
  type Margen,
} from '../../../entities/dinero/margen'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El margen que ya leyó la vista: el desglose no vuelve a leer.
  margen: Margen
}

function Cifras({ margen }: { margen: Margen }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {textosDelMargen(margen).map((cifra) => (
        <div
          key={cifra.clave}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5"
          data-cifra={cifra.clave}
        >
          <dt className="min-w-0 font-medium text-(--color-ink)">{cifra.etiqueta}</dt>
          <dd className="text-end font-medium break-words">
            {cifra.monto === null ? (
              <span className="font-normal text-(--color-ink-soft)">{cifra.sinDato}</span>
            ) : (
              <Monto valor={cifra.monto} />
            )}
          </dd>
          <dd className="col-span-2 text-(length:--text-sm) text-(--color-ink-soft)">
            {QUE_ES_LA_CIFRA[cifra.clave]}
            {cifra.nota ? ` Va ${cifra.nota}.` : ''}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function RealPorCategoria({ margen }: { margen: Margen }) {
  const titulo = useId()
  return (
    <section className="grid gap-1.5" aria-labelledby={titulo}>
      <h3 id={titulo} className="text-(length:--text-sm) font-medium">
        Real por categoría
      </h3>
      {margen.porCategoria.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_GASTOS_REGISTRADOS}</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {margen.porCategoria.map((c) => (
            <li
              key={c.categoriaId}
              className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 text-(length:--text-sm)"
            >
              <span className="min-w-0 break-words">{c.nombre}</span>
              <Monto valor={c.real} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** «Ver el desglose» de la vista «Margen» (`?panel=desglose-del-margen`): las cinco cifras de la base en moneda base, qué es cada una y el real por categoría. Sólo lectura. */
export function DesgloseDelMargen({ abierto, alCerrar, margen }: Props) {
  const { monedaBase } = useRegional()
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Desglose del margen"
      descripcion={`En ${monedaBase}, como lo calcula el sistema.`}
      ancho="amplio"
      completoEnCelular
      focoAlCerrar={focoDeQuienAbrio}
    >
      <div className="grid min-w-0 gap-5" data-desglose-del-margen="">
        <Cifras margen={margen} />
        <RealPorCategoria margen={margen} />
      </div>
    </Modal>
  )
}
