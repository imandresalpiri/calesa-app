'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { descartarLogo, subirLogo, type LogoListo } from '../../../composicion.client'
import { firmaDeLogos, type ListaDeLogos, type VarianteDelLogo } from '../../../entities/logos'
import type { RespuestaDeLogos } from '../../../entities/repositorios'
import { useOrdenDeLogos } from './use-orden-de-logos'
import { usePedidosDeLogos } from './use-pedidos-de-logos'

export type EnvioDeLogos = Envio<RespuestaDeLogos>

const REFRESCAN = new Set(['conflicto', 'sin_permiso'])
const SIN_RED: EnvioDeLogos = {
  ok: false,
  sinRed: true,
  error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
}

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la local se vuelve a sembrar con eso.
function useListaSembrada(inicial: ListaDeLogos) {
  const firma = firmaDeLogos(inicial)
  const [visto, setVisto] = useState(firma)
  const [lista, setLista] = useState(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLista(inicial)
  }
  return [lista, setLista] as const
}

// Las variantes del logo en Configuración. Cada escritura devuelve la lista entera con las versiones nuevas y esa reemplaza a la local: ningún
// pedido extra. Una escritura a la vez (`mandar` devuelve nulo si ya había una). Un conflicto o un permiso que ya no está se dicen y la página se
// vuelve a leer. Sumar sube primero el archivo (por su hash) y, si la base no lo recibe, lo descarta si quedó huérfano.
export function useLogos(inicial: ListaDeLogos) {
  const [lista, poner] = useListaSembrada(inicial)
  const router = useRouter()
  const unaVez = useUnEnvioALaVez()
  const pedir = usePedidosDeLogos()

  function mandar(pedido: () => Promise<EnvioDeLogos>): Promise<EnvioDeLogos | null> {
    return unaVez.mandar(async () => {
      const envio = await pedido()
      if (envio.ok) {
        poner(envio.data.lista)
      }
      return envio
    })
  }

  function rechazar(envio: EnvioDeLogos) {
    if (envio.ok) {
      return
    }
    avisarError(envio.error)
    if (REFRESCAN.has(envio.error.codigo)) {
      router.refresh()
    }
  }

  // Sube el archivo y suma la variante con el id del intento. Sin red, el archivo elegido sigue en el modal y sale al volver la conexión.
  async function crear(id: string, nombre: string, logo: LogoListo): Promise<EnvioDeLogos | null> {
    return mandar(async () => {
      const subido = await subirLogo(logo)
      if (!subido.ok) {
        return typeof navigator !== 'undefined' && !navigator.onLine
          ? SIN_RED
          : { ok: false, error: subido.error, porCampo: { archivo: subido.error.mensaje } }
      }
      const envio = await pedir.crear({
        id,
        nombre,
        ruta: subido.data.ruta,
        tipo: logo.extension,
        ancho: Math.max(1, Math.round(logo.medidas.ancho)),
        alto: Math.max(1, Math.round(logo.medidas.alto)),
      })
      if (!envio.ok && !('sinRed' in envio)) {
        // El rechazo es de la base (nombre repetido, tope): el archivo recién subido, si nadie más lo usa, se va.
        await descartarLogo(subido.data.ruta)
      }
      return envio
    })
  }

  function renombrar(logo: VarianteDelLogo, nombre: string) {
    return mandar(() => pedir.renombrar(logo, nombre))
  }

  async function quitar(logo: VarianteDelLogo): Promise<boolean> {
    const envio = await mandar(() => pedir.quitar(logo))
    if (!envio?.ok) {
      if (envio) {
        rechazar(envio)
      }
      return false
    }
    if (envio.data.ruta !== null) {
      await descartarLogo(envio.data.ruta)
    }
    avisarExito(`«${logo.nombre}» quitado.`)
    return true
  }

  const orden = useOrdenDeLogos({ lista, poner, unaVez, pedir, rechazar })

  return {
    lista,
    anuncio: orden.anuncio,
    movimiento: orden.movimiento,
    enCurso: unaVez.enCurso,
    // Los dos del modal devuelven el envío entero: el modal dice el motivo junto al campo.
    crear,
    renombrar,
    mover: orden.mover,
    soltar: orden.soltar,
    quitar,
    usos: pedir.usos,
  }
}

export type Logos = ReturnType<typeof useLogos>
