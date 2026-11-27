import { getAjustes } from '@/modules/empresa'
import {
  gruposVisibles,
  estadoDeLaBandeja,
  leerGrupoDeLaBandeja,
  type GrupoDeLaBandeja,
  type GrupoDeLaBandejaLeido,
} from '@/modules/logistica'
import { BandejaDelDia } from '@/modules/logistica/pantallas/alertas'
import { fallo, MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { PRIMERAS_DE_LA_BANDEJA } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import { MarcasDeLogistica } from './marcas-de-logistica'

// Un grupo del origen con sus primeras filas y el conteo hasta 100. Un fallo (de red o de forma) queda en ese grupo: los demás se dibujan igual.
async function leerElGrupo(
  grupo: GrupoDeLaBandeja,
  origenId: string,
): Promise<GrupoDeLaBandejaLeido> {
  try {
    return {
      grupo,
      resultado: await leerGrupoDeLaBandeja({
        grupo,
        origenId,
        tope: PRIMERAS_DE_LA_BANDEJA,
        conConteo: true,
        cursor: null,
      }),
    }
  } catch {
    return { grupo, resultado: fallo('inesperado', MENSAJE_INESPERADO) }
  }
}

// La bandeja del día de un origen (`/logistica/bandeja`): una lectura por grupo que ve quien mira en ese origen, todas en paralelo y cada una con su error aparte.
// Las filas no dicen su origen: todas son del elegido. La llama la página tras `abrirLaPestana` (ya pasó `await connection()`).
export async function BandejaDelOrigen({
  permisos,
  origenId,
}: {
  permisos: Permisos
  origenId: string
}) {
  const [leidos, ajustes] = await Promise.all([
    Promise.all(gruposVisibles(permisos, origenId).map((grupo) => leerElGrupo(grupo, origenId))),
    getAjustes(),
  ])
  // Los vehículos de los grupos que se leyeron (a lo sumo 7 grupos de 5): su «visto» es el de `/logistica/vehiculo/[id]`.
  const ids = leidos.flatMap((leido) =>
    leido.resultado.ok ? leido.resultado.data.filas.map((fila) => fila.vehiculoId) : [],
  )
  return (
    <MarcasDeLogistica ids={ids}>
      <BandejaDelDia
        estado={estadoDeLaBandeja(leidos)}
        permisos={permisos}
        ahora={new Date()}
        zona={ajustes.zonaHoraria}
        origenes={null}
        origenId={origenId}
      />
    </MarcasDeLogistica>
  )
}
