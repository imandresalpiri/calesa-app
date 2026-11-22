import Link from 'next/link'
import { datosO } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { leerTablaParaEditar } from '../../../areas/tablas/composicion'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import {
  lugarDelDestino,
  rutaDeLasTablas,
  type DestinoDeLasTablas,
  type LugarDeLasTablas,
} from '../../../entities/tablas/rutas'
import { EditorDeTablaDiferido } from './diferidos'

type Props = {
  destino: DestinoDeLasTablas
  // El ítem de la lista con el id pedido; sin él, la tabla no se edita desde aquí.
  item: TablaDeReferencia | undefined
}

function NoSeEdita({ mensaje, lugar }: { mensaje: string; lugar: LugarDeLasTablas }) {
  return (
    <Aviso tono="aviso">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 break-words">{mensaje}</span>
        <Link href={rutaDeLasTablas(lugar)} className="underline underline-offset-4">
          Volver a las tablas
        </Link>
      </div>
    </Aviso>
  )
}

// `?tabla=<id>` (4.23-3, C4): se abre sólo si está en la lista (la del origen o la de las compartidas). Se lee entera (`leerTablaParaEditar`); la que no está, no se ve o pasa de 2.000 filas lo
// dice con «Volver a las tablas». Otro fallo sube al `error.tsx` con «Reintentar». `tapada` sale del ítem de la lista (la lectura de una tabla no la sabe).
export async function TablaAbierta({ destino, item }: Props) {
  const lugar = lugarDelDestino(destino)
  if (!item) {
    return (
      <NoSeEdita
        mensaje={
          destino === 'compartidas'
            ? 'No encontramos esa tabla compartida.'
            : `No encontramos esa tabla de referencia en ${destino.origen.nombre}.`
        }
        lugar={lugar}
      />
    )
  }
  const leida = await leerTablaParaEditar(item.id)
  if (!leida.ok && (leida.error.codigo === 'no_encontrado' || leida.error.codigo === 'regla')) {
    return <NoSeEdita mensaje={leida.error.mensaje} lugar={lugar} />
  }
  const { tabla, filas } = datosO(leida)
  return (
    <EditorDeTablaDiferido
      key={`${tabla.id}:${String(tabla.version)}`}
      tabla={{ ...tabla, tapada: item.tapada }}
      filas={filas}
      destino={destino}
    />
  )
}
