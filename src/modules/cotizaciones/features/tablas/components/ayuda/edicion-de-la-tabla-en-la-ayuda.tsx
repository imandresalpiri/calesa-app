'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import type { PropsDeLaEdicionDeLaTabla } from '../../../hoja/components/huecos'
import {
  TablaDeLaAyuda,
  type PropsDeLaTablaDeLaAyuda,
} from '../../../hoja/components/tabla-de-la-ayuda'
import { useEdicionEnLaAyuda } from '../../hooks/use-edicion-en-la-ayuda'
import { useEsperaDeLaHoja } from '../../hooks/use-espera-de-la-hoja'
import { useGuardadoEnLaAyuda } from '../../hooks/use-guardado-en-la-ayuda'
import { filaEditada, motivoDeLaBarra } from './fila-editada'
import { PieDeLaEdicion } from './pie-de-la-edicion'

// La tabla de un bloque de la ayuda, editable por quien configura (el hueco `EdicionDeLaTabla`; `docs/UX.md` › «La ayuda»). Primero, la de la hoja con ✎ y 🗑 por
// fila y «+ Añadir fila»: el primer toque lee la tabla viva y lo pedido se hace al llegar. Con ella, se dibujan sus filas (sin botones que llenan ni «Tu vehículo»: lo
// que se ve es lo que se publica), una abierta a la vez, y la barra con «Guardar»; cerrar una fila sin nada editado vuelve a la de la hoja. Lo editado no tiene borrador:
// cerrar la ayuda con cambios pregunta.
export function EdicionDeLaTablaEnLaAyuda({
  tabla,
  rotulo,
  base,
  enLaConfiguracion,
  alPublicada,
}: PropsDeLaEdicionDeLaTabla) {
  const { locale } = useRegional()
  const edicion = useEdicionEnLaAyuda({
    tablaId: tabla.id,
    mostradas: base.tabla.filas,
    cortada: base.tabla.hayMas,
    columnasDelBloque: base.columnas,
  })
  const { espera, esperar } = useEsperaDeLaHoja()
  const guardado = useGuardadoEnLaAyuda({
    edicion,
    rotulo,
    alPublicar: (publicacion) => {
      if (alPublicada(publicacion) === 'hoja') esperar()
    },
  })
  useCambiosSinGuardar(edicion.cambios, guardado.descartar, { preguntaAlCerrar: true })
  const { leida } = edicion
  const pie = (
    <PieDeLaEdicion
      edicion={edicion}
      guardado={guardado}
      espera={espera}
      enLaConfiguracion={enLaConfiguracion}
      motivo={motivoDeLaBarra(edicion)}
    />
  )
  const vivas = leida?.edicion.estado.filas
  const props: PropsDeLaTablaDeLaAyuda = vivas
    ? {
        tabla: { ...base.tabla, filas: vivas.map((f) => f.valores), hayMas: false },
        columnas: edicion.columnas,
        dinero: base.dinero,
      }
    : base
  if (props.tabla.filas.length === 0) {
    return (
      <div className="grid gap-3">
        <EstadoVacio compacto titulo="Esta tabla no tiene filas." />
        {pie}
      </div>
    )
  }
  const abierta = vivas ? vivas.findIndex((f) => f.id === leida.edicion.editando) : -1
  return (
    <TablaDeLaAyuda
      {...props}
      edicion={{
        fila: (indice) =>
          filaEditada(edicion, {
            indice,
            lugar: formatearNumero(indice + 1, { locale, decimales: 0 }),
            guardando: guardado.enCurso,
          }),
        abierta: abierta === -1 ? null : abierta,
        pie,
      }}
    />
  )
}
