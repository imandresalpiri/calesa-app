'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import type { ClaveDeGrupo } from '../../../entities/documentos/tipo-de-documento'
import {
  alTopeDelGrupo,
  firmaDelOrden,
  motivoDeSoloLectura,
  textoDelTope,
  type VistaDeGrupo,
} from '../../../entities/documentos/vista-de-grupo'
import type { TiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { filasDeTipos } from './filas-de-tipos'

type Props = {
  clave: ClaveDeGrupo
  vista: VistaDeGrupo
  // «De Miami» («Del flujo de repuestos») o «Compartidos».
  titulo: string
  vacio: string
  tipos: TiposDeDocumento
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

// Un grupo del drawer de los tipos de documento (los del flujo o los compartidos): su título (`h3`: el drawer es el `h2`), el aviso de sólo lectura si
// quien mira no lo cambia, el del tope si se llenó, y la lista con su orden por botones. Sin permiso, «Editar» y el orden se ven apagados con su
// motivo: nunca desaparecen en silencio.
export function GrupoDeTipos({
  clave,
  vista,
  titulo,
  vacio,
  tipos,
  alEditar,
  alPedirEliminar,
}: Props) {
  const { grupo, puedeCambiar } = vista
  const prefijo = `tipo-de-documento-${clave}`
  const idDeTitulo = `titulo-de-tipos-${clave}`
  // El foco vuelve al botón cuando la lista ya está reordenada: la página trae el orden nuevo después de la respuesta, y mover la fila lo quitaría antes.
  const movido = tipos.movimiento?.grupo === clave ? tipos.movimiento : null
  useFocoTrasMover(
    prefijo,
    movido && firmaDelOrden(grupo.tipos) !== movido.firmaAntes ? movido : null,
  )

  const filas = filasDeTipos(vista, clave, {
    alEditar,
    alActivar: (uno, activo) => void tipos.activar(uno, activo),
    alPedirEliminar,
  })

  return (
    <section className="grid gap-3" aria-labelledby={idDeTitulo}>
      <h3 id={idDeTitulo} className="text-(length:--text-base) font-semibold text-(--color-ink)">
        {titulo}
      </h3>
      {puedeCambiar ? null : <Aviso tono="info">{motivoDeSoloLectura(clave)}</Aviso>}
      {puedeCambiar && alTopeDelGrupo(grupo) ? (
        <Aviso tono="aviso">{textoDelTope(grupo.tope)}</Aviso>
      ) : null}
      {filas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{vacio}</p>
      ) : (
        <ListaDeCatalogo
          filas={filas}
          prefijo={prefijo}
          columnaDeUso="Uso"
          {...(clave === 'compartido' ? { verbo: 'Editar' } : {})}
          alAbrir={(id) => {
            if (puedeCambiar) {
              alEditar(id)
            }
          }}
          alMover={(id, direccion) => {
            const tipo = grupo.tipos.find((uno) => uno.id === id)
            if (tipo && puedeCambiar) void tipos.mover(tipo, direccion)
          }}
        />
      )}
    </section>
  )
}
