import {
  leerCatalogosDeTransporte,
  leerGrupo,
  tipoDeLaBaseDe,
  type VistaDeGrupos,
} from '@/modules/logistica'
import { ResumenDelGrupo } from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { MarcasDeLogistica } from '../marcas-de-logistica'
import { HUECOS_DEL_GRUPO, huecosDelGrupo, puedeEditarTransporte } from './huecos-del-grupo'

// El resumen del grupo con esa clave: sus unidades y los huecos que la persona puede usar. Una clave que no existe y una que no se ve dan el mismo grupo sin unidades (la base no distingue); un
// error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function GrupoAbierto({
  clave,
  vista,
  permisos,
  claveDeUrl,
  origenId,
}: {
  clave: string
  vista: VistaDeGrupos
  permisos: Permisos
  claveDeUrl: string
  origenId: string
}) {
  const [grupo, catalogos] = await Promise.all([
    leerGrupo(tipoDeLaBaseDe(vista), clave),
    leerCatalogosDeTransporte(),
  ])
  const leido = datosO(grupo)
  // Las unidades que son vehículos (un repuesto no tiene página): su «visto» es el de `/logistica/vehiculo/[id]`. La fila del grupo no se marca: su clave no es un uuid.
  const ids = leido.unidades.flatMap((unidad) =>
    unidad.vehiculoId === null ? [] : [unidad.vehiculoId],
  )
  return (
    <MarcasDeLogistica ids={ids}>
      <ResumenDelGrupo
        grupo={leido}
        vista={vista}
        catalogos={datosO(catalogos)}
        huecos={huecosDelGrupo(HUECOS_DEL_GRUPO, permisos)}
        puedeEditar={puedeEditarTransporte(permisos)}
        claveDeUrl={claveDeUrl}
        origenId={origenId}
      />
    </MarcasDeLogistica>
  )
}
