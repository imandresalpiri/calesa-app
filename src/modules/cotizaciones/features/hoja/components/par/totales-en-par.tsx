'use client'

import { MontoConDecimales } from '@/shared/ui/monto-con-decimales'
import { totalDelResumen, type ContextoDeHoja } from '../../../../entities/binding'
import type { HojaLista } from '../../../../entities/hoja'
import { rotuloEnPar, type ParDeHoja } from '../../../../entities/hoja-en-par'
import { MONEDA_DEL_PRIMER_RESULTADO } from '../../../../entities/primer-resultado'
import type { EstadoDeRecalculo } from '../../../../entities/recalculo'
import { AvisoDeFallo, AvisosDelTotal } from '../partes-del-total'
import { CIFRA_DEL_TOTAL, ETIQUETA_DEL_TOTAL, TARJETA_EN_LA_SECCION } from '../clases-del-total'
import { TotalEnMonedaLocal } from '../total-en-moneda-local'

type Columna = { contexto: ContextoDeHoja; estado: EstadoDeRecalculo; alReintentar: () => void }

// Los dos totales de una hoja en par (la tarjeta suelta, arriba de «Avanzado»; lado a lado cuando hay ancho) (glosario: «Variante en par»): cada uno con su opción («Total · 20 pies»), su valor por `<Monto>`, el de la moneda
// local si se pidió, sus avisos y, si su recálculo falló, su «Reintentar» (la otra columna sigue).
export function TotalesEnPar({
  tarjeta,
  par,
  columnas,
  monedaDelTotalBs,
  alRecargar,
}: {
  tarjeta: HojaLista['tarjetaTotal']
  par: ParDeHoja
  columnas: readonly [Columna, Columna]
  monedaDelTotalBs: string | null
  alRecargar: () => void
}) {
  return (
    <div className="grid gap-3 @3xl/secciones:grid-cols-2">
      {columnas.map((columna, lado) => {
        const opcion = par.opciones[lado === 0 ? 0 : 1]
        const total = totalDelResumen(columna.contexto)
        return (
          <div key={opcion.clave} className="grid min-w-0 content-start gap-1">
            <div data-tarjeta-del-total="" className={TARJETA_EN_LA_SECCION}>
              <span className={ETIQUETA_DEL_TOTAL}>{rotuloEnPar(tarjeta.etiqueta, opcion)}</span>
              <strong data-total="" data-opcion={opcion.clave} className={CIFRA_DEL_TOTAL}>
                {total.tipo === 'valor' ? (
                  <MontoConDecimales
                    valor={total.usd}
                    moneda={MONEDA_DEL_PRIMER_RESULTADO}
                    decimales={tarjeta.decimales}
                  />
                ) : (
                  '—'
                )}
              </strong>
            </div>
            {monedaDelTotalBs === null ? null : (
              <TotalEnMonedaLocal
                respuesta={columna.contexto.respuesta}
                moneda={monedaDelTotalBs}
                decimales={tarjeta.decimales}
              />
            )}
            <AvisosDelTotal total={total} estado={columna.estado} variante={undefined} />
            <AvisoDeFallo
              estado={columna.estado}
              alReintentar={columna.alReintentar}
              alRecargar={alRecargar}
            />
          </div>
        )
      })}
    </div>
  )
}
