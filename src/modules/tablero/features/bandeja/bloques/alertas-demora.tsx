// Bloque «Alertas por demora»: las unidades que llevan más días de lo esperado en su fase, la más pasada de su límite arriba (6.12-2). Lee por la
// entrada pública de `logistica` (`bandejaLogistica`, una lectura por request para los tres bloques de logística). Cada fila abre su
// página; «Ver todas» (sólo con tope) lleva al grupo «Demorados» de la bandeja del día de logística.
import {
  bandejaLogistica,
  detalleDeDemorada,
  gruposVisibles,
  rutaDelGrupoDeLaBandeja,
} from '@/modules/logistica'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoAlertasDemora: CuerpoDeBloque = async ({ bloque, permisos }) => {
  const lectura = await bandejaLogistica(TOPE_DE_BLOQUE)
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data.demoradas
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  const ahora = new Date()
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: fila.titulo,
          detalle: detalleDeDemorada(fila, ahora),
          ruta: unidadDeLogistica(fila.id),
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'unidad demorada',
          plural: 'unidades demoradas',
        })}
      />
      <VerTodasDelBloque
        bloque={bloque}
        ruta={rutaDelGrupoDeLaBandeja('demorados')}
        hayMas={hayMas}
        puedeAbrir={gruposVisibles(permisos).includes('demorados')}
      />
    </>
  )
}
