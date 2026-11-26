'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Monto } from '@/shared/ui/monto'
import { ResumenDeLaTarjeta, TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { useComprasDelPanel } from './compras-del-item-proveedor'

type Props = {
  // A dónde llevan (los arma `src/app`, que conoce la URL del proyecto): el formulario con el ítem ya elegido y la pestaña «Compras».
  hrefRegistrar: string
  hrefVerTodas: string
  // Nulo = se puede registrar; si no, el motivo (`motivoParaNoEscribirCompras`).
  motivoParaNoRegistrar: string | null
}

// La tarjeta «Compras» del panel del ítem (sólo con `repuestos.costos.ver`): cuántas tiene el ítem (con tope: «20+») y la última (proveedor y monto). Tocarla registra una compra con el ítem ya elegido;
// sin `repuestos.costos.editar` o con el proyecto cerrado, abre las compras del proyecto y el «⋯» dice por qué no se registra. «Ver todas en Compras» va siempre en el «⋯».
export function TarjetaDeComprasDelItem({
  hrefRegistrar,
  hrefVerTodas,
  motivoParaNoRegistrar,
}: Props) {
  const router = useRouter()
  const compras = useComprasDelPanel()
  const lectura = compras?.lectura
  const puedeRegistrar = motivoParaNoRegistrar === null
  const ir = (href: string) => () => {
    router.push(href as Route)
  }
  return (
    <TarjetaTocable
      densidad="compacta"
      titulo="Compras"
      accion={puedeRegistrar ? 'Registrar compra' : 'Ver las compras'}
      etiquetaDelMenu={puedeRegistrar ? 'Registrar compra…' : 'Ver las compras…'}
      motivo={null}
      abrir={ir(puedeRegistrar ? hrefRegistrar : hrefVerTodas)}
      extra={
        puedeRegistrar
          ? [
              {
                tipo: 'accion',
                clave: 'ver-todas',
                etiqueta: 'Ver todas en Compras',
                despuesDeCerrar: true,
                alElegir: ir(hrefVerTodas),
              },
            ]
          : [{ tipo: 'nota', clave: 'motivo', texto: motivoParaNoRegistrar }]
      }
    >
      <ResumenDeLaTarjeta
        titulo="Compras"
        estado={lectura?.estado ?? 'leyendo'}
        alReintentar={() => {
          compras?.reintentar()
        }}
      >
        {lectura?.estado === 'leido' ? <ResumenLeido {...lectura.dato} /> : null}
      </ResumenDeLaTarjeta>
    </TarjetaTocable>
  )
}

function ResumenLeido({
  filas,
  hayMas,
}: {
  filas: readonly { proveedor: string | null; moneda: string; monto: number }[]
  hayMas: boolean
}) {
  const ultima = filas[0]
  if (ultima === undefined) {
    return <p className="text-(length:--text-sm)">Este ítem no tiene compras registradas.</p>
  }
  return (
    <>
      <p className="text-(length:--text-sm)">
        {`${String(filas.length)}${hayMas ? '+' : ''} ${filas.length === 1 && !hayMas ? 'compra' : 'compras'}`}
      </p>
      <p className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
        Última: {ultima.proveedor ?? 'Sin proveedor'} ·{' '}
        <Monto valor={ultima.monto} moneda={ultima.moneda} />
      </p>
    </>
  )
}
