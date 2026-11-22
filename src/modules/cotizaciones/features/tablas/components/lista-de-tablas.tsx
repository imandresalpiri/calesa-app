'use client'

import { useId, type ReactNode } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { useRegional } from '@/shared/ui/regional'
import { TOPE_DE_TABLAS, type TablaDeReferencia } from '../../../entities/tablas/lectura'
import type { DestinoDeLasTablas } from '../../../entities/tablas/rutas'
import { BotonDeNuevaTabla } from './boton-de-nueva-tabla'
import { FilaDeTabla } from './fila-de-tabla'

type Props = {
  destino: DestinoDeLasTablas
  lectura: { tablas: readonly TablaDeReferencia[]; hayMas: boolean }
}

function Grupo({
  titulo,
  tablas,
  destino,
  derecha,
  vacio,
}: {
  titulo: string
  tablas: readonly TablaDeReferencia[]
  destino: DestinoDeLasTablas
  // Lo que va a la derecha del título («Nueva tabla»).
  derecha?: ReactNode
  // Lo que se dice sin tablas; sin él, el grupo vacío no se dibuja.
  vacio?: string
}) {
  const idTitulo = useId()
  if (tablas.length === 0 && vacio === undefined) return null
  return (
    <section aria-labelledby={idTitulo} className="grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 id={idTitulo} className="min-w-0 font-semibold break-words text-(--color-ink)">
          {titulo}
        </h3>
        {derecha}
      </div>
      {tablas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{vacio}</p>
      ) : (
        <ul aria-labelledby={idTitulo} className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {tablas.map((tabla) => (
            <FilaDeTabla
              key={tabla.id}
              tabla={tabla}
              lugar={destino.en}
              origen={destino.origen.nombre}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// La lista de tablas de referencia del drawer (4.23-3, C3) en dos grupos con su título: «De <origen>» (las propias, con «Nueva tabla» arriba a la derecha) y
// «Compartidas» (las que recibe de la empresa; no se dibuja sin ninguna). «Nueva tabla» se apaga con 100 tablas.
export function ListaDeTablas({ destino, lectura }: Props) {
  const { locale } = useRegional()
  const { origen } = destino
  const enElTope = lectura.hayMas || lectura.tablas.length >= TOPE_DE_TABLAS
  const propias = lectura.tablas.filter((tabla) => !tabla.compartida)
  const compartidas = lectura.tablas.filter((tabla) => tabla.compartida)
  return (
    <>
      <Grupo
        titulo={`De ${origen.nombre}`}
        tablas={propias}
        destino={destino}
        vacio={`${origen.nombre} no tiene tablas propias.`}
        derecha={<BotonDeNuevaTabla origen={origen} lugar={destino.en} enElTope={enElTope} />}
      />
      <Grupo titulo="Compartidas" tablas={compartidas} destino={destino} />
      {lectura.hayMas ? (
        <AvisoDeTope
          texto={`Mostrando las ${formatearNumero(TOPE_DE_TABLAS, { locale, decimales: 0 })} primeras tablas.`}
        />
      ) : null}
    </>
  )
}
