import { NoLeidosDeLaBarra } from '@/modules/chat/shell.client'
import type { EstadoDelLive } from '@/modules/equipo/shell.client'
import type { Permisos } from '@/shared/lib/permisos'
import { EnlaceNav } from './enlace-nav'
import { entradasVisibles } from './navegacion'

// La navegación principal, filtrada por los permisos de quien entra. Se dibuja igual en la barra
// de escritorio y dentro del menú de móvil. Con el Modo Live, sólo lo que sus ajustes muestran (se decide acá, en el servidor).
export function BarraLateral({ permisos, live }: { permisos: Permisos; live: EstadoDelLive }) {
  const entradas = entradasVisibles(permisos, 'principal', live)

  return (
    <nav aria-label="Principal">
      <ul className="grid gap-0.5">
        {entradas.map(({ clave, ruta, titulo, Icono }) => (
          <li key={clave}>
            <EnlaceNav ruta={ruta} titulo={titulo}>
              <Icono aria-hidden />
              <span className="truncate group-data-plegado/lateral:sr-only">{titulo}</span>
              {clave === 'chat' ? <NoLeidosDeLaBarra /> : null}
            </EnlaceNav>
          </li>
        ))}
      </ul>
    </nav>
  )
}
