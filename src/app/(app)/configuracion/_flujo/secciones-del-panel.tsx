import { Suspense, type ReactNode } from 'react'
import type { FlujoFijo, SeccionesDelPanel } from '@/modules/flujos/pantallas/configuracion'
import { EsqueletoDeReglas, PantallaDeReglas } from '@/modules/flujos/pantallas/reglas'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'

type Pedido = { permisos: Permisos; fijo: FlujoFijo }

// Lo que se abre en el panel del flujo desde su barra (`?seccion=reglas`): su título, lo que dibuja cuando la URL lo pide y su esqueleto. Sólo se arma para
// quien edita el flujo (en lectura no hay «Reglas»). Los catálogos (también los tipos de documento) abren su propio drawer: `catalogos-del-flujo.tsx`.
const PANELES = {
  reglas: {
    titulo: 'Reglas del flujo',
    contenido: ({ permisos, fijo }: Pedido) => (
      <PantallaDeReglas permisos={permisos} origenes={getOrigenes(true)} fijo={fijo} />
    ),
    esqueleto: () => <EsqueletoDeReglas />,
  },
} satisfies Record<
  keyof SeccionesDelPanel,
  { titulo: string; contenido: (pedido: Pedido) => ReactNode; esqueleto: () => ReactNode }
>

// Las secciones del panel: la que pide la URL se lee (detrás de su `<Suspense>`); las otras van con su esqueleto, así el panel abre en el acto y la sección
// llega del servidor.
export function seccionesDelPanel(
  pedido: Pedido,
  seccionPedida: string | undefined,
): SeccionesDelPanel {
  return Object.fromEntries(
    Object.entries(PANELES).map(([clave, panel]) => [
      clave,
      {
        titulo: panel.titulo,
        contenido: (
          <Suspense fallback={panel.esqueleto()}>
            {seccionPedida === clave ? panel.contenido(pedido) : panel.esqueleto()}
          </Suspense>
        ),
      },
    ]),
  )
}
