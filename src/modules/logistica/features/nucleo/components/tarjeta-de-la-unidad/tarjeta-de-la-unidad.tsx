'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DEL_HUECO_ABIERTO } from '../../../../entities/nucleo/enlaces'
import {
  ATRIBUTO_DEL_BLOQUE,
  useAlCambiarLaUnidad,
  useAlPedirAbrirElHueco,
} from '../../hooks/eventos-de-la-unidad'
import { enfocarAlAparecer } from '../../hooks/enfocar-al-aparecer'
import { ProveedorDeLaTarjeta, type PedidoDeAbrir } from './contexto'

/** Las claves de la URL que el drawer de la tarjeta trae consigo: se borran al cerrarlo, y con `abreSola` una de ellas lo abre aunque falte `?hueco=` (D16). */
export type UrlDeLaTarjeta = {
  claves: readonly string[]
  abreSola?: readonly { clave: string; valores: readonly string[] }[]
}

type Props = {
  unidadId: string
  // La clave de la tarjeta (`documentos`, `dinero`): el valor de la URL que abre su drawer.
  clave: string
  titulo: string
  // Las claves de los huecos que contiene (`gastos`, `pagos`, `margen` en Dinero): un ancla por cada uno desde el primer render, para que los atajos de «Qué falta» los encuentren.
  huecos: readonly string[]
  // El drawer: los huecos de la tarjeta ya dibujados por el servidor. Se monta al abrirse.
  contenido: ReactNode
  // Lo que dice la tarjeta (`ResumenDeLaTarjeta`, tras su `Suspense`): llega después que el marco y mide lo mismo que su esqueleto.
  children: ReactNode
  // Tocar la tarjeta: la acción principal. Sin `enfocar`, sólo abre el drawer.
  enfocarAlTocar?: string | null
  // `?hueco=` en la página; `?seccion=` en un drawer (un segundo drawer: `?panel=` cerraría el de afuera).
  claveDeLaUrl?: string
  url?: UrlDeLaTarjeta
  // El texto del toque para el teclado («Ver los documentos»).
  etiqueta: string
}

const SIN_URL: UrlDeLaTarjeta = { claves: [] }

function abiertaPorOtraClave(
  url: UrlDeLaTarjeta,
  valor: (clave: string) => string | null,
): boolean {
  return (url.abreSola ?? []).some((una) => {
    const v = valor(una.clave)
    return v !== null && una.valores.includes(v)
  })
}

// Si mientras el drawer estuvo abierto algo cambió en la unidad (un documento, una nota, un pago), al cerrarlo se relee la página: así los resúmenes del servidor quedan al
// día sin que cada tarjeta escuche nada. `router.refresh()` conserva el estado del cliente.
function useRefrescarAlCerrar(unidadId: string, abierta: boolean) {
  const router = useRouter()
  const huboCambio = useRef(false)
  const antes = useRef(abierta)
  useAlCambiarLaUnidad(unidadId, () => {
    huboCambio.current = true
  })
  useEffect(() => {
    if (antes.current && !abierta && huboCambio.current) {
      huboCambio.current = false
      router.refresh()
    }
    antes.current = abierta
  }, [abierta, router])
}

// Una tarjeta de la unidad (`docs/GLOSARIO.md` › «Tarjeta de la unidad»): alto fijo, su título, lo que dice (del servidor) y su «⋯»; tocarla hace la principal y abre sus huecos
// en un drawer al costado (`?hueco=<tarjeta>`). El atajo de una falta («Subir», «Revisar», «Registrar pago») pide su hueco con `abrirHueco` y la tarjeta que lo contiene abre su
// drawer; el hueco, ya montado, atiende el resto.
export function TarjetaDeLaUnidad({
  unidadId,
  clave,
  titulo,
  huecos,
  contenido,
  children,
  enfocarAlTocar = null,
  claveDeLaUrl = CLAVE_DEL_HUECO_ABIERTO,
  url = SIN_URL,
  etiqueta,
}: Props) {
  const panel = usePanelPorUrl(clave, url.claves, { clave: claveDeLaUrl })
  const abierta = panel.abierto || abiertaPorOtraClave(url, panel.valor)
  const idDelTitulo = useId()
  useRefrescarAlCerrar(unidadId, abierta)
  const abrir = (pedido: PedidoDeAbrir = {}) => {
    if (!panel.abierto) panel.abrir(pedido.url ?? {})
    if (pedido.enfocar) enfocarAlAparecer(pedido.enfocar, { campo: true })
  }
  return (
    <ProveedorDeLaTarjeta value={{ clave, abrir }}>
      <section
        aria-labelledby={idDelTitulo}
        data-tarjeta={clave}
        className="relative grid h-32 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-1 overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 has-data-aviso:border-(--color-aviso) has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2)"
      >
        <ToqueDeLaTarjeta
          etiqueta={etiqueta}
          abrir={() => {
            abrir(enfocarAlTocar ? { enfocar: enfocarAlTocar } : {})
          }}
          datosDelBoton={{ 'data-abre-tarjeta': clave }}
        />
        {huecos.map((hueco) => (
          <span key={hueco} hidden {...{ [ATRIBUTO_DEL_BLOQUE]: hueco }} />
        ))}
        <OyentesDeLosHuecos huecos={huecos} alPedir={() => abrir()} />
        <h3
          id={idDelTitulo}
          className="pointer-events-none relative truncate pe-10 text-(length:--text-base) font-medium text-(--color-ink)"
        >
          {titulo}
        </h3>
        {children}
      </section>
      <Drawer abierto={abierta} alCerrar={panel.cerrar} titulo={titulo} ancho="amplio">
        {contenido}
      </Drawer>
    </ProveedorDeLaTarjeta>
  )
}

// Cada hueco de la tarjeta escucha «abre ese hueco» (el atajo de «Qué falta», la barra «Mover»): uno por hueco, sin dibujar nada.
function OyentesDeLosHuecos({
  huecos,
  alPedir,
}: {
  huecos: readonly string[]
  alPedir: () => void
}) {
  return huecos.map((hueco) => <OyenteDelHueco key={hueco} hueco={hueco} alPedir={alPedir} />)
}

function OyenteDelHueco({ hueco, alPedir }: { hueco: string; alPedir: () => void }) {
  useAlPedirAbrirElHueco(hueco, alPedir)
  return null
}
