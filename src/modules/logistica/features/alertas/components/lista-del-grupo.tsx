import type { Route } from 'next'
import Link from 'next/link'
import { codificarCursor } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import type { Permisos } from '@/shared/lib/permisos'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoVacio } from '@/shared/ui/estados'
import { Paginacion } from '@/shared/ui/paginacion'
import { rutaDelGrupoDeLaBandeja, type GrupoDeLaBandeja } from '../../../entities/alertas/grupos'
import type { LecturaDelGrupo } from '../../../entities/alertas/grupo-leido'
import { enElOrigen } from '../../../entities/nucleo/enlaces'
import { FilasDelGrupo } from './filas-del-grupo'

type Props = {
  grupo: GrupoDeLaBandeja
  titulo: string
  lectura: LecturaDelGrupo
  // Esta página no es la primera (llegó con un cursor).
  hayCursor: boolean
  permisos: Permisos
  ahora: Date
  zona: string
  origenes: ReadonlyMap<string, string> | null
  // El origen de la bandeja: «Ver la bandeja» y «Seguir buscando» lo llevan (la paginación conserva la URL).
  origenId: string
}

// Una frase por grupo para el vacío: «No hay demorados hoy.»
const VACIO: Readonly<Record<GrupoDeLaBandeja, string>> = {
  demorados: 'No hay demorados hoy.',
  trabados: 'No hay trabados hoy.',
  por_aprobar: 'No hay documentos por aprobar.',
  por_vencer: 'No hay documentos por vencer.',
  llegadas: 'No hay llegadas esperadas.',
  salidas: 'Nada sale hoy.',
  sin_resolver: 'No hay subastas sin resolver.',
}

// La página de un grupo entero: de a `TAMANO_DE_LA_BANDEJA` por cursor, sin total ni «Página N». Con la base parada a medio camino (`cortada`, en trabados y documentos) se dice y se ofrece
// «Seguir buscando» desde donde quedó.
export function ListaDelGrupo({
  grupo,
  titulo,
  lectura,
  hayCursor,
  permisos,
  ahora,
  zona,
  origenes,
  origenId,
}: Props) {
  // El cursor de lo que sigue: el de la última fila leída (o, con la base parada a medio camino, hasta donde llegó).
  const siguiente = lectura.siguiente
    ? codificarCursor({
        instante: lectura.siguiente.desde,
        id: lectura.siguiente.id,
        sentido: 'siguiente',
      })
    : null
  const volver = (
    <Link
      href={enElOrigen(RUTAS.bandejaDeLogistica, origenId) as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
    >
      Ver la bandeja
    </Link>
  )
  if (lectura.filas.length === 0 && lectura.cortada && siguiente !== null) {
    return (
      <div className="grid gap-3">
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {grupo === 'trabados'
            ? 'Se revisaron 200 demorados sin encontrar más trabados.'
            : 'Se revisó mucho sin encontrar más en este grupo.'}
        </p>
        <Link
          href={rutaDelGrupoDeLaBandeja(grupo, { origenId, cursor: siguiente }) as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Seguir buscando
        </Link>
      </div>
    )
  }
  if (lectura.filas.length === 0) {
    return hayCursor ? (
      <EstadoPaginaSinFilas />
    ) : (
      <EstadoVacio titulo={VACIO[grupo]} accion={volver} />
    )
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{titulo}</p>
      <div className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-3">
        <FilasDelGrupo
          filas={lectura.filas}
          permisos={permisos}
          ahora={ahora}
          zona={zona}
          origenes={origenes}
        />
      </div>
      {lectura.cortada && siguiente !== null ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          La búsqueda paró antes de llegar al final: «Siguientes» sigue desde donde quedó.
        </p>
      ) : null}
      <Paginacion siguiente={siguiente} anterior={null} />
    </div>
  )
}
