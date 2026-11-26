'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import type { AccionDeMenu } from '@/shared/ui/lista'
import { TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'

type Destino = { texto: string; href: string | null }

type Props = {
  // Lo que dice el proyecto de su vehículo («Toyota Hilux · VIN …», «Proyecto externo · sin vehículo»); con `href`, a su ficha.
  vehiculo: Destino
  // El cliente del proyecto como lo resolvió la página («Cliente que no puedes ver», «—»…); con `href`, a su ficha.
  cliente: Destino
}

// La tarjeta «Vehículo y cliente» del panel del ítem (sólo en la hoja del proyecto): a quién pertenece el ítem. Es texto: tocarla abre la ficha del vehículo (o la del cliente, si no hay
// vehículo) y el «⋯» ofrece las dos. Sin ninguna ficha que abrir, la tarjeta se lee y el «⋯» lo dice.
export function TarjetaDeVehiculoYCliente({ vehiculo, cliente }: Props) {
  const router = useRouter()
  const ir = (href: string) => () => {
    router.push(href as Route)
  }
  const destinos: { clave: string; etiqueta: string; href: string }[] = []
  if (vehiculo.href !== null) {
    destinos.push({ clave: 'vehiculo', etiqueta: 'Abrir el vehículo', href: vehiculo.href })
  }
  if (cliente.href !== null) {
    destinos.push({ clave: 'cliente', etiqueta: 'Abrir el cliente', href: cliente.href })
  }
  const [principal, ...demas] = destinos
  const extra: AccionDeMenu[] = demas.map((d) => ({
    tipo: 'accion',
    clave: d.clave,
    etiqueta: `${d.etiqueta}…`,
    despuesDeCerrar: true,
    alElegir: ir(d.href),
  }))
  return (
    <TarjetaTocable
      densidad="compacta"
      titulo="Vehículo y cliente"
      accion={principal?.etiqueta ?? 'Abrir el vehículo'}
      etiquetaDelMenu={`${principal?.etiqueta ?? 'Abrir el vehículo'}…`}
      motivo={principal === undefined ? 'Este proyecto no tiene una ficha que abrir.' : null}
      abrir={principal === undefined ? () => undefined : ir(principal.href)}
      extra={extra}
    >
      <dl className="grid min-h-10 content-start gap-0.5 text-(length:--text-sm)">
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-(--color-ink-soft)">Vehículo</dt>
          <dd className="min-w-0 truncate" title={vehiculo.texto}>
            {vehiculo.texto}
          </dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-(--color-ink-soft)">Cliente</dt>
          <dd className="min-w-0 truncate" title={cliente.texto}>
            {cliente.texto}
          </dd>
        </div>
      </dl>
    </TarjetaTocable>
  )
}
