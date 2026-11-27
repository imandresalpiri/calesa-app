import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { BuscadorDeConfiguracion } from '../_navegacion/buscador-de-configuracion'
import { destinosFueraDeQuienMira, gruposDeQuienMira } from '../_navegacion/grupos-de-quien-mira'
import { leerFaltas } from '../lectura-de-que-falta'
import type { SeccionConFaltas } from '../que-falta'
import { QueFaltaDeLaSeccion } from '../que-falta-de-la-seccion'
import { gruposVisibles } from '../secciones'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Configuración' }

const CON_FALTAS: readonly string[] = ['origenes', 'empresa'] satisfies SeccionConFaltas[]

function tieneFaltas(clave: string): clave is SeccionConFaltas {
  return CON_FALTAS.includes(clave)
}

// El inicio de Configuración (`/configuracion` redirige aquí): arriba el buscador y debajo una tarjeta por grupo con las secciones que esta
// persona puede abrir, en mampostería (columnas CSS: las tarjetas de distinto alto no dejan huecos entre sí). De cada sección, su título (el
// enlace), una frase de qué se configura y lo que falta, que llega después sin frenar las tarjetas. El menú de Configuración va a la
// izquierda, como en cualquier sección (el layout).
export default async function PaginaInicioDeConfiguracion() {
  const oculto = await ocultoEnElLive('origenes.lectura')
  if (oculto) {
    return oculto
  }
  const sesion = await requerirSesion()
  const grupos = gruposVisibles(sesion.permisos)
  if (grupos.length === 0) {
    return <EstadoSinPermiso />
  }
  // Una sola lectura, que esperan las tarjetas que la usan. No lanza.
  const faltas = leerFaltas(sesion.permisos)
  const [delNavegador, fuera] = await Promise.all([gruposDeQuienMira(), destinosFueraDeQuienMira()])
  return (
    <div className="@container/inicio grid gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Configuración</h1>
      <BuscadorDeConfiguracion grupos={delNavegador} fuera={fuera} variante="pagina">
        <div className="columns-[20rem] gap-4">
          {grupos.map((grupo) => {
            const idDelTitulo = `grupo-${grupo.clave}`
            return (
              <section
                key={grupo.clave}
                aria-labelledby={idDelTitulo}
                className="mb-4 grid min-w-0 break-inside-avoid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
              >
                <h2
                  id={idDelTitulo}
                  className="text-(length:--text-base) font-semibold text-(--color-ink)"
                >
                  {grupo.titulo}
                </h2>
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
                  {grupo.secciones.map(({ clave, titulo, descripcion, ruta, Icono }) => (
                    <li key={clave} className="grid min-w-0 gap-0.5">
                      <Link
                        // Las rutas de las secciones existen: lo garantiza secciones.test.ts contra el disco.
                        href={ruta as Route}
                        className="-ml-1 inline-flex min-h-[44px] items-center gap-2 justify-self-start rounded-(--radius-md) px-1 text-(length:--text-sm) font-medium text-(--color-ink) outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
                      >
                        <Icono aria-hidden className="size-4 shrink-0 text-(--color-ink-soft)" />
                        {titulo}
                      </Link>
                      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
                        {descripcion}
                      </p>
                      {tieneFaltas(clave) ? (
                        <Suspense fallback={null}>
                          <QueFaltaDeLaSeccion faltas={faltas} seccion={clave} />
                        </Suspense>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </BuscadorDeConfiguracion>
    </div>
  )
}
