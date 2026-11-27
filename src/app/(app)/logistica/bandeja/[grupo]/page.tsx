import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getAjustes } from '@/modules/empresa'
import {
  enElOrigen,
  grupoDelSlug,
  gruposVisibles,
  leerGrupoDeLaBandeja,
  TITULO_DE_LOS_GRUPOS,
} from '@/modules/logistica'
import { ErrorDelGrupo, ListaDelGrupo } from '@/modules/logistica/pantallas/alertas-grupo'
import { EsqueletoDeLaBandeja } from '@/modules/logistica/pantallas/alertas-esqueletos'
import { conteoCorto } from '@/shared/lib/conteo'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { leerCursor, TAMANO_DE_LA_BANDEJA } from '@/shared/lib/paginacion'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { abrirLaPestana } from '../../abrir-la-pestana'
import { BarraDeLogistica } from '../../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../../esqueleto-de-la-barra'
import { MarcasDeLogistica } from '../../marcas-de-logistica'

export const metadata: Metadata = { title: 'Bandeja del día · Logística' }

type Props = PageProps<'/logistica/bandeja/[grupo]'>

// `/logistica/bandeja/[grupo]`: un grupo de la bandeja del día de un origen entero (demorados, trabados, por aprobar…), de a `TAMANO_DE_LA_BANDEJA` por cursor, con
// el mismo detalle y la misma acción que la pestaña. El nombre de la URL sale de `grupos.ts`; uno que no existe dice que no hay tal bandeja. Un grupo que quien
// mira no ve en ese origen (sin el permiso de documentos) es «sin permiso». En la barra, otro origen abre su Bandeja del día (sin el grupo ni el cursor).
export default function PaginaDeUnGrupo({ params, searchParams }: Props) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <Suspense fallback={<EsqueletoDeLaBarra />}>
        <BarraDeLogistica searchParams={searchParams} pestana="bandeja" />
      </Suspense>
      <Suspense fallback={<EsqueletoDeLaBandeja />}>
        <Grupo params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function Volver({ origenId }: { origenId: string }) {
  return (
    <Link
      href={enElOrigen(RUTAS.bandejaDeLogistica, origenId) as Route}
      className={buttonVariants({ variant: 'outline' })}
    >
      Ver la bandeja
    </Link>
  )
}

async function Grupo({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  const abierta = await abrirLaPestana(searchParams, 'bandeja')
  if (abierta.tipo === 'estado') return abierta.estado
  const { permisos, origen, parametros } = abierta
  const grupo = grupoDelSlug((await params).grupo)
  if (grupo === null) {
    return <EstadoVacio titulo="Esa bandeja no existe." accion={<Volver origenId={origen.id} />} />
  }
  if (!gruposVisibles(permisos, origen.id).includes(grupo)) {
    return <EstadoSinPermiso />
  }
  const cursor = leerCursor(unParametro(parametros[CLAVE_DE_CURSOR]))
  const [lectura, ajustes] = await Promise.all([
    leerGrupoDeLaBandeja({
      grupo,
      origenId: origen.id,
      tope: TAMANO_DE_LA_BANDEJA,
      // El conteo («37», «100+») sólo en la primera página.
      conConteo: cursor === null,
      cursor: cursor === null ? null : { desde: cursor.instante, id: cursor.id },
    }),
    getAjustes(),
  ])
  const titulo = TITULO_DE_LOS_GRUPOS[grupo]
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <header className="grid gap-1">
        <Link
          href={enElOrigen(RUTAS.bandejaDeLogistica, origen.id) as Route}
          className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:underline md:min-h-0"
        >
          La bandeja del día
        </Link>
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          {titulo} · {origen.nombre}
        </h1>
      </header>
      {lectura.ok ? (
        <MarcasDeLogistica ids={lectura.data.filas.map((fila) => fila.vehiculoId)}>
          <ListaDelGrupo
            grupo={grupo}
            titulo={
              lectura.data.conteo
                ? `${conteoCorto(lectura.data.conteo)} en este grupo.`
                : 'Siguientes del grupo.'
            }
            lectura={lectura.data}
            hayCursor={cursor !== null}
            permisos={permisos}
            ahora={new Date()}
            zona={ajustes.zonaHoraria}
            origenes={null}
            origenId={origen.id}
          />
        </MarcasDeLogistica>
      ) : (
        <ErrorDelGrupo titulo={titulo} />
      )}
    </div>
  )
}
