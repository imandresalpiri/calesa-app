'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  puedeMoverse,
  textoDelLugar,
  type CamposDeEnlace,
  type Direccion,
  type EnlaceDeAyudaDeLaEmpresa,
  type ListaDeEnlacesDeLaEmpresa,
} from '../../../entities/enlaces-de-ayuda'
import { firmaDeEnlaces } from '../../../entities/paneles-de-enlaces-de-ayuda'
import { usePedidosDeEnlaces } from './use-pedidos-de-enlaces'

export type EnvioDeEnlaces = Envio<ListaDeEnlacesDeLaEmpresa>

const REFRESCAN = new Set(['conflicto', 'sin_permiso'])

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la local se vuelve a sembrar con eso.
function useListaSembrada(inicial: ListaDeEnlacesDeLaEmpresa) {
  const firma = firmaDeEnlaces(inicial)
  const [visto, setVisto] = useState(firma)
  const [lista, setLista] = useState(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLista(inicial)
  }
  return [lista, setLista] as const
}

// Los enlaces de ayuda de la empresa en Configuración. Cada escritura devuelve la lista entera con las versiones nuevas y esa reemplaza a la
// local: ningún pedido extra. Una escritura a la vez (`mandar` devuelve nulo si ya había una). Un conflicto o un permiso que ya no está se
// dicen y la página se vuelve a leer.
export function useEnlacesDeAyuda(inicial: ListaDeEnlacesDeLaEmpresa) {
  const [lista, poner] = useListaSembrada(inicial)
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()
  const pedir = usePedidosDeEnlaces()
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  function mandar(pedido: () => Promise<EnvioDeEnlaces>): Promise<EnvioDeEnlaces | null> {
    return unaVez.mandar(async () => {
      const envio = await pedido()
      if (envio.ok) {
        poner(envio.data)
      }
      return envio
    })
  }

  function rechazar(envio: EnvioDeEnlaces) {
    if (envio.ok) {
      return
    }
    avisarError(envio.error)
    if (REFRESCAN.has(envio.error.codigo)) {
      router.refresh()
    }
  }

  // Activar o desactivar guarda solo y es reversible: se ofrece «Deshacer» (con la versión nueva).
  async function activar(enlace: EnlaceDeAyudaDeLaEmpresa, activo: boolean) {
    const envio = await mandar(() => pedir.guardar(enlace, { activo }))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      rechazar(envio)
      return
    }
    const quedo = envio.data.enlaces.find((uno) => uno.id === enlace.id)
    if (quedo) {
      avisarConDeshacer(`«${enlace.titulo}» ${activo ? 'activado' : 'desactivado'}.`, () => {
        void activar(quedo, !activo)
      })
    }
  }

  async function mover(enlace: EnlaceDeAyudaDeLaEmpresa, direccion: Direccion) {
    if (!puedeMoverse(lista.enlaces, enlace.id, direccion)) {
      return
    }
    const envio = await mandar(() => pedir.mover(enlace, direccion))
    if (!envio) {
      return
    }
    if (!envio.ok) {
      rechazar(envio)
      return
    }
    setAnuncio(textoDelLugar(envio.data.enlaces, enlace.id))
    setMovimiento((antes) => ({ id: enlace.id, direccion, veces: (antes?.veces ?? 0) + 1 }))
  }

  async function quitar(enlace: EnlaceDeAyudaDeLaEmpresa): Promise<boolean> {
    const envio = await mandar(() => pedir.quitar(enlace))
    if (!envio?.ok) {
      if (envio) {
        rechazar(envio)
      }
      return false
    }
    avisarExito(`«${enlace.titulo}» quitado.`)
    return true
  }

  return {
    lista,
    anuncio,
    movimiento,
    enCurso: unaVez.enCurso,
    // Los dos del modal devuelven el envío entero: el modal dice el motivo junto al campo.
    crear: (id: string, campos: CamposDeEnlace) => mandar(() => pedir.crear(id, campos)),
    guardar: (enlace: EnlaceDeAyudaDeLaEmpresa, cambios: Partial<CamposDeEnlace>) =>
      mandar(() => pedir.guardar(enlace, cambios)),
    activar,
    mover,
    quitar,
  }
}

export type EnlacesDeAyuda = ReturnType<typeof useEnlacesDeAyuda>
