import type { Route } from 'next'
import Link from 'next/link'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import type { ClaveDePaso, EstadoDePaso } from '../../../entities/pasos'
import { IconoDelPaso } from './icono-del-paso'

// Un paso ya con su destino (lo resuelve `src/app`, que conoce las pestañas y los permisos): sin permiso, `motivo` y sin enlace.
export type PasoDeLaTira = {
  clave: string
  titulo: string
  estado: EstadoDePaso
  frase: string
  ruta: string
  motivo: string | null
}

type Props =
  | {
      pasos: readonly PasoDeLaTira[]
      // Mientras el origen está en su puesta en marcha: el paso que le toca, con la insignia «Pendiente», y adónde se sigue.
      pendiente?: ClaveDePaso | null
      seguir?: { ruta: string } | null
    }
  | { inactivo: true }

// «Para cotizar y mover»: lo que le falta a un origen, en una fila de cinco pasos (ícono, nombre y una frase corta) que en el celular se
// parte en dos columnas (una sola si el texto está grande y no caben: el «Pendiente» no se parte). Cada paso lleva a su pestaña; sin el permiso, se dice el motivo debajo, sin enlace. Durante la puesta en marcha, el
// paso que le toca dice «Pendiente» y junto al título va «Seguir la puesta en marcha», la única acción principal del bloque. Un origen
// inactivo dice sólo «Inactivo». Sin JS: es del servidor.
export function ParaCotizarYMover(props: Props) {
  const seguir = 'inactivo' in props ? null : (props.seguir ?? null)
  return (
    <section aria-labelledby="para-cotizar-titulo" className="grid gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2
          id="para-cotizar-titulo"
          className="text-(length:--text-sm) font-medium text-(--color-ink-soft)"
        >
          Para cotizar y mover
        </h2>
        {seguir === null ? null : (
          <Link
            // La ruta la arma `rutaDeLaPuestaEnMarcha()`.
            href={seguir.ruta as Route}
            className={`${buttonVariants({ size: 'lg' })} min-h-11 w-full sm:w-auto md:min-h-9`}
          >
            Seguir la puesta en marcha
          </Link>
        )}
      </div>
      {'inactivo' in props ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Inactivo: no recibe vehículos ni cotizaciones nuevos.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {props.pasos.map((paso) => (
            <li key={paso.clave} className="min-w-0">
              <Paso paso={paso} pendiente={paso.clave === props.pendiente} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const CAJA =
  'flex h-full min-w-0 items-start gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2'

type PropsDelPaso = { paso: PasoDeLaTira; pendiente: boolean }

function Contenido({ paso, pendiente }: PropsDelPaso) {
  return (
    <>
      <IconoDelPaso estado={paso.estado} />
      <span className="grid min-w-0 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
            {paso.titulo}
          </span>
          {pendiente ? (
            <Badge className="bg-(--color-aviso-soft) text-(--color-aviso-ink)">Pendiente</Badge>
          ) : null}
        </span>
        <span className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {paso.frase}
        </span>
        {paso.motivo === null ? null : (
          <span className="text-(length:--text-xs) break-words text-(--color-ink-faint)">
            {paso.motivo}
          </span>
        )}
      </span>
    </>
  )
}

function Paso({ paso, pendiente }: PropsDelPaso) {
  if (paso.motivo !== null) {
    return (
      <div className={CAJA}>
        <Contenido paso={paso} pendiente={pendiente} />
      </div>
    )
  }
  return (
    <Link
      // La ruta la declara `src/app` y un test comprueba que existe.
      href={paso.ruta as Route}
      className={`${CAJA} outline-none hover:border-(--color-line-strong) hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)`}
    >
      <Contenido paso={paso} pendiente={pendiente} />
    </Link>
  )
}
