'use client'

import { TOPE_DE_CATALOGO, type ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import type { Direccion, FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import type { TextosDelCatalogo } from './tipos'

type Props = {
  filas: readonly FilaDeCatalogo[]
  lista: readonly ElementoDeCatalogo[]
  hayMas: boolean
  prefijo: string
  textos: TextosDelCatalogo
  soloLectura: boolean
  alAbrir: (elemento: ElementoDeCatalogo) => void
  alMover: (elemento: ElementoDeCatalogo, direccion: Direccion) => void
}

// La lista del drawer: el vacío por primera vez o las filas con su «⋯» (sin Subir y Bajar si es de sólo lectura), y el aviso de tope.
export function ListaDelCatalogo({
  filas,
  lista,
  hayMas,
  prefijo,
  textos,
  soloLectura,
  alAbrir,
  alMover,
}: Props) {
  const elementoDe = (id: string) => lista.find((fila) => fila.id === id)
  return (
    <>
      {filas.length === 0 ? (
        <EstadoVacio
          compacto
          titulo={textos.vacioTitulo}
          {...(soloLectura ? {} : { descripcion: textos.vacioDescripcion })}
        />
      ) : (
        <ListaDeCatalogo
          filas={filas}
          prefijo={prefijo}
          columnaDeUso={textos.item.varios.replace(/^./, (letra) => letra.toUpperCase())}
          sinOrden={soloLectura}
          alAbrir={(id) => {
            const elemento = elementoDe(id)
            if (elemento && !soloLectura) {
              alAbrir(elemento)
            }
          }}
          alMover={(id, direccion) => {
            const elemento = elementoDe(id)
            if (elemento) {
              alMover(elemento, direccion)
            }
          }}
        />
      )}
      {hayMas ? <AvisoDeTope texto={textoDelTope(TOPE_DE_CATALOGO, textos.tope)} /> : null}
    </>
  )
}
