'use client'

import type { DestinoAlQuitar, ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Envio } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Confirmar } from '@/shared/ui/confirmar'
import { muevelosAntes, usoDelElemento } from './frases'
import type { TextosDelCatalogo } from './tipos'
import { SIN_DESTINO, useConfirmarQuitar } from './use-confirmar-quitar'

type Props = {
  url: { abierto: boolean; elemento: ElementoDeCatalogo | null; cerrar: () => void }
  lista: readonly ElementoDeCatalogo[]
  usos: ReadonlyMap<string, number>
  textos: TextosDelCatalogo
  prefijo: string
  enCurso: boolean
  alQuitar: (elemento: ElementoDeCatalogo, destino: DestinoAlQuitar) => Promise<Envio<unknown>>
}

// «Quitar» un elemento (`?quitar=<id>`; irreversible: lo nombra). Sin ítems, se quita. Con ítems, pide a dónde moverlos —otro activo o
// «Sin grupo»— y los mueve y lo quita en un solo paso.
export function ConfirmarQuitar({ url, lista, usos, textos, prefijo, enCurso, alQuitar }: Props) {
  const { elemento } = url
  const quitar = useConfirmarQuitar({ elemento, usos, cerrar: url.cerrar, alQuitar })
  const nombre = elemento?.nombre ?? ''
  const cuantos = quitar.n > 0 ? usoDelElemento(quitar.n, textos) : textos.item.varios
  const destinos = lista.filter((otro) => otro.activo && otro.id !== elemento?.id)
  return (
    <Confirmar
      abierto={url.abierto}
      alCerrar={quitar.cerrar}
      alConfirmar={quitar.confirmar}
      titulo={`Quitar ${textos.articulo} ${textos.elemento} «${nombre}»`}
      descripcion={
        quitar.conItems
          ? `«${nombre}» tiene ${cuantos}. ${muevelosAntes(quitar.n || 2, textos)}`
          : `No tiene ${textos.item.varios}. No se puede deshacer.`
      }
      etiquetaConfirmar={quitar.conItems ? 'Mover y quitar' : 'Quitar'}
      enCurso={enCurso}
      focoAlCerrar={() =>
        document.querySelector<HTMLElement>(
          `[data-mas-acciones="${prefijo}-${elemento?.id ?? ''}-mas"]`,
        ) ?? true
      }
    >
      {quitar.conItems ? (
        <CampoSeleccion
          nombre="destino-al-quitar"
          etiqueta={`Mover sus ${cuantos} a…`}
          opciones={[
            { valor: SIN_DESTINO, etiqueta: textos.ninguno },
            ...destinos.map((otro) => ({ valor: otro.id, etiqueta: otro.nombre })),
          ]}
          value={quitar.destino}
          onChange={(evento) => {
            quitar.elegirDestino(evento.target.value)
          }}
          error={quitar.errorDestino}
          disabled={enCurso}
        />
      ) : null}
      {quitar.error ? (
        <Aviso tono="peligro">
          <p>{quitar.error}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
