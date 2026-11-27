import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BadgeDeSituacion } from '@/modules/vehiculos/client'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button'
import { textoDeDiasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'

type Props = {
  unidad: UnidadAbierta
  // El nombre del origen de la unidad.
  origen: string
  // La fase de la unidad (nombre y color); nula si no tiene.
  fase: { nombre: string; color: string } | null
  // Una línea de aviso bajo la cabecera (p. ej. que no se pudo leer el flujo del origen).
  aviso?: string | null
  // Lo que sólo pone la página (los compone `src/app`: `logistica` no conoce `vehiculos`): la portada, «VIN X · Lote N», el toque que abre la ficha completa (cubre la cabecera) y
  // «Relacionados» en una línea a la derecha.
  enLaPagina?: {
    foto?: ReactNode
    identidad?: ReactNode
    ficha?: ReactNode
    relacionados?: ReactNode
    // La unidad lleva en su fase más días de los que la fase tolera (`demoraDeLaUnidad`).
    demora?: { dias: number } | null
  }
}

// «Abrir proyecto» para un ítem (sin su proyecto, ningún enlace). Un vehículo no lleva enlace: en la página, la cabecera entera abre su ficha.
function EnlaceAlProyecto({ unidad }: { unidad: UnidadAbierta }) {
  if (unidad.tipo !== 'repuesto' || unidad.proyecto === undefined) return null
  return (
    <Link
      href={`${RUTAS.repuestos}/${unidad.proyecto.id}` as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}
    >
      Abrir proyecto
    </Link>
  )
}

function LineaDeLaFase({
  unidad,
  origen,
  fase,
  demora = null,
}: Pick<Props, 'unidad' | 'origen' | 'fase'> & { demora?: { dias: number } | null }) {
  const dias = textoDeDiasEnLaFase(unidad.faseDesde)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>{origen}</span>
      <BadgeDeSituacion situacion={unidad.situacion} fase={fase} />
      {dias ? <span>{dias}</span> : null}
      {demora ? (
        <Badge variant="destructive" title={`Más de ${demora.dias} días en esta fase`}>
          Demorada
        </Badge>
      ) : null}
    </div>
  )
}

// El cuerpo de la cabecera deja pasar el clic al toque que la cubre (abre la ficha) y sólo recupera el suyo un enlace o un botón (un relacionado).
const SOBRE_EL_TOQUE =
  'pointer-events-none relative [&_a]:pointer-events-auto [&_button]:pointer-events-auto'

function Titulo({ texto, truncar }: { texto: string; truncar: boolean }) {
  return (
    <h2
      tabIndex={-1}
      className={`${truncar ? 'truncate' : ''}text-(length:--text-lg) font-semibold text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)`}
    >
      {texto}
    </h2>
  )
}

type DeLaPagina = NonNullable<Props['enLaPagina']>

// La cabecera en la página: baja, con la portada chica, «VIN X · Lote N», la fase con «Demorada» y «Relacionados» a la derecha en una línea. Tocarla abre la ficha completa.
function CabeceraEnLaPagina({
  unidad,
  origen,
  fase,
  aviso,
  enLaPagina,
}: Omit<Props, 'enLaPagina'> & { enLaPagina: DeLaPagina }) {
  const { foto = null, identidad = null, ficha = null, relacionados = null } = enLaPagina
  return (
    <header
      data-slot="cabecera-de-la-unidad"
      className="relative flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-2 has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2) @min-[56rem]/unidad:h-20 @min-[56rem]/unidad:flex-nowrap"
    >
      {ficha}
      {foto ? <div className={SOBRE_EL_TOQUE}>{foto}</div> : null}
      <div className={`grid min-w-0 flex-1 basis-48 gap-0.5 ${SOBRE_EL_TOQUE}`}>
        <Titulo texto={unidad.titulo} truncar />
        <div className="h-5 truncate text-(length:--text-sm) text-(--color-ink-soft)">
          {identidad}
        </div>
        <LineaDeLaFase
          unidad={unidad}
          origen={origen}
          fase={fase}
          demora={enLaPagina.demora ?? null}
        />
        {aviso ? (
          <p className="truncate text-(length:--text-sm) text-(--color-ink-soft)" title={aviso}>
            {aviso}
          </p>
        ) : null}
      </div>
      {relacionados ? (
        <div
          className={`min-w-0 basis-full truncate @min-[56rem]/unidad:max-w-[45%] @min-[56rem]/unidad:basis-auto ${SOBRE_EL_TOQUE}`}
        >
          {relacionados}
        </div>
      ) : null}
    </header>
  )
}

// La cabecera de la unidad: el título (el primer `h2` del panel: `enfocarElTituloDeLaUnidad` lo enfoca tras mover), el origen, la fase real o su insignia («Sin fase», «Sin resolver») y los días
// en ella. En un drawer es una columna suelta; en la página, `CabeceraEnLaPagina`. Compatible con servidor.
export function CabeceraDeLaUnidad({ unidad, origen, fase, aviso = null, enLaPagina }: Props) {
  if (enLaPagina !== undefined) {
    return (
      <CabeceraEnLaPagina
        unidad={unidad}
        origen={origen}
        fase={fase}
        aviso={aviso}
        enLaPagina={enLaPagina}
      />
    )
  }
  return (
    <header data-slot="cabecera-de-la-unidad" className="grid gap-2">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Titulo texto={unidad.titulo} truncar={false} />
        <EnlaceAlProyecto unidad={unidad} />
      </div>
      <LineaDeLaFase unidad={unidad} origen={origen} fase={fase} />
      {aviso ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{aviso}</p> : null}
    </header>
  )
}
