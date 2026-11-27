import type { Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { SettingsIcon } from 'lucide-react'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA, type OrigenDeLaCadena } from '@/modules/logistica'
import { PestanasDeOrigen } from '@/modules/logistica/pantallas/barra'
import type { Permisos } from '@/shared/lib/permisos'
import { rutaDeParteDelOrigen, unParametro } from '@/shared/lib/rutas'
import {
  destinoDeConfigurar,
  hrefDeOtroOrigen,
  pestanasDelOrigen,
  pestanasQuePidenElFlujo,
  type PestanaDeLogistica,
} from './enlaces'
import { origenDeLaPagina, type OrigenDeLaPagina } from './origen-de-la-pagina'
import { RecordarElOrigen } from './recordar-el-origen'

type Parametros = Promise<Record<string, string | string[] | undefined>>

// La barra de arriba de toda página de Logística, en dos filas de alto fijo (el mismo de `EsqueletoDeLaBarra`): los orígenes, como en Vehículos, y las pestañas del
// origen elegido (Cadena · Bandeja del día · y Embarques, Aduana, Gastos si su flujo las usa y la persona las ve), con el ⚙ «Configurar» a la derecha. La dibuja
// cada página, no el layout: un layout no recibe `?origen=` ni se vuelve a dibujar entre páginas hermanas, y la unidad marca el origen de su vehículo. Enlaces de
// servidor: lo único del cliente es el desborde de la primera fila y guardar el último origen.
export async function BarraDeLogistica({
  searchParams,
  pestana,
}: {
  searchParams: Parametros
  pestana: PestanaDeLogistica
}) {
  await connection()
  const pedido = unParametro((await searchParams)[CLAVE_DE_ORIGEN_DE_LOGISTICA])
  const datos = await origenDeLaPagina(pedido)
  const origen = datos.resuelto.tipo === 'ok' ? datos.resuelto.origen : null
  return (
    <Barra
      datos={datos}
      pestana={pestana}
      marcado={origen?.id ?? null}
      recordar={datos.resuelto.tipo === 'ok' && datos.resuelto.recordar}
    />
  )
}

// La barra en la página de una unidad: marca el origen del vehículo y sus pestañas son las de ese origen. Entrar a un vehículo no es elegir un origen: no se
// recuerda. Si la persona no tiene ese origen entre los suyos (la base igual le deja ver la unidad), ninguno queda marcado y las pestañas son las del que se
// abriría sin `?origen=`; también si la unidad no se pudo abrir (`origenId` nulo).
export async function BarraDeLaUnidad({ origenId }: { origenId: string | null }) {
  const delVehiculo = origenId === null ? null : await origenDeLaPagina(origenId)
  if (delVehiculo !== null && delVehiculo.resuelto.tipo === 'ok') {
    return <Barra datos={delVehiculo} pestana={null} marcado={origenId} recordar={false} />
  }
  return (
    <Barra
      datos={await origenDeLaPagina(undefined)}
      pestana={null}
      marcado={null}
      recordar={false}
    />
  )
}

function Barra({
  datos,
  pestana,
  marcado,
  recordar,
}: {
  datos: OrigenDeLaPagina
  pestana: PestanaDeLogistica | null
  marcado: string | null
  recordar: boolean
}) {
  const { permisos, resuelto, paraConfigurar } = datos
  if (
    resuelto.tipo !== 'ok' &&
    resuelto.tipo !== 'sin_permiso' &&
    resuelto.tipo !== 'no_disponible'
  ) {
    return null
  }
  const deLasPestanas = resuelto.tipo === 'ok' ? resuelto.origen : null
  const configurar = destinoDeConfigurar(deLasPestanas?.id ?? null, paraConfigurar)
  return (
    <div data-barra-de-logistica className="grid gap-1">
      <PestanasDeOrigen
        pestanas={resuelto.origenes.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          color: o.color,
          href: hrefDeOtroOrigen(pestana, o, permisos),
        }))}
        actual={marcado}
      />
      <div className="flex h-11 min-w-0 items-center gap-2 md:h-8">
        {deLasPestanas !== null ? (
          <PestanasDelOrigen origen={deLasPestanas} pestana={pestana} permisos={permisos} />
        ) : (
          <span className="flex-1" />
        )}
        {configurar !== null ? (
          <Link
            href={rutaDeParteDelOrigen(configurar, 'fases')}
            aria-label="Configurar la logística"
            className="inline-flex h-full min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-(--radius-pill) px-3 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink)"
          >
            <SettingsIcon aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Configurar</span>
          </Link>
        ) : null}
      </div>
      {recordar && deLasPestanas !== null ? <RecordarElOrigen origenId={deLasPestanas.id} /> : null}
    </div>
  )
}

// La segunda fila: las pestañas del origen. Si su flujo no se pudo leer, sólo Cadena y Bandeja del día, y una línea lo dice en la misma fila (no cambia el alto).
function PestanasDelOrigen({
  origen,
  pestana,
  permisos,
}: {
  origen: OrigenDeLaCadena
  pestana: PestanaDeLogistica | null
  permisos: Permisos
}) {
  return (
    <nav
      aria-label={`Logística de ${origen.nombre}`}
      className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden"
    >
      {pestanasDelOrigen(permisos, origen).map((p) => (
        <Link
          key={p.clave}
          href={p.href as Route}
          aria-current={p.clave === pestana ? 'page' : undefined}
          className="inline-flex h-full shrink-0 items-center rounded-(--radius-pill) px-3 text-(length:--text-sm) whitespace-nowrap text-(--color-ink-soft) hover:text-(--color-ink) aria-[current=page]:bg-(--color-surface) aria-[current=page]:font-medium aria-[current=page]:text-(--color-ink)"
        >
          {p.titulo}
        </Link>
      ))}
      {origen.reglas === null ? (
        <p
          role="status"
          className="flex shrink-0 items-center gap-2 px-2 text-(length:--text-sm) whitespace-nowrap text-(--color-ink-soft)"
        >
          No pudimos leer el flujo de {origen.nombre}: faltan {enumerar(pestanasQuePidenElFlujo())}.
          <Link
            href={hrefDeOtroOrigen(pestana, origen, permisos) as Route}
            className="font-medium text-(--color-ink) underline underline-offset-2"
          >
            Reintentar
          </Link>
        </p>
      ) : null}
    </nav>
  )
}

// «Embarques, Aduana y Gastos».
function enumerar(titulos: readonly string[]): string {
  if (titulos.length <= 1) return titulos.join('')
  return `${titulos.slice(0, -1).join(', ')} y ${titulos.at(-1) ?? ''}`
}
