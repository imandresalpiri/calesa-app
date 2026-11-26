import { Suspense, type ReactNode } from 'react'
import type { FlujoFijo, SeccionesDelPanel } from '@/modules/flujos/pantallas/configuracion'
import { EsqueletoDeTipos, PantallaDeDocumentos } from '@/modules/flujos/pantallas/documentos'
import { EsqueletoDeReglas, PantallaDeReglas } from '@/modules/flujos/pantallas/reglas'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'

type Pedido = { permisos: Permisos; fijo: FlujoFijo }

// Lo que se abre en el panel del flujo desde su barra (`?seccion=reglas|documentos`): su título, lo que dibuja cuando la URL lo pide y su esqueleto. Quien
// abre un flujo fijo ya lo configura, así que ve las dos.
const PANELES = {
  reglas: {
    titulo: 'Reglas del flujo',
    contenido: ({ permisos, fijo }: Pedido) => (
      <PantallaDeReglas permisos={permisos} origenes={getOrigenes(true)} fijo={fijo} />
    ),
    esqueleto: () => <EsqueletoDeReglas />,
  },
  documentos: {
    titulo: 'Tipos de documento',
    // Los de este flujo y los compartidos, marcados los que tapa (los compartidos también viven en Logística › Configuración › Tipos de documento).
    contenido: ({ permisos, fijo }: Pedido) => (
      <PantallaDeDocumentos
        grupos="flujo"
        permisos={permisos}
        origenes={getOrigenes(true)}
        fijo={fijo}
      />
    ),
    esqueleto: () => <EsqueletoDeTipos />,
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
