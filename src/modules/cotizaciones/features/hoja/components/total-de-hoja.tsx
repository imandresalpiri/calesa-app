'use client'

import { Monto } from '@/shared/ui/monto'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import type { TotalDeHoja as Total } from '../../../entities/hoja'
import { MONEDA_DEL_PRIMER_RESULTADO } from '../../../entities/primer-resultado'
import { CIFRA_DEL_TOTAL, ETIQUETA_DEL_TOTAL, TARJETA_EN_LA_SECCION } from './clases-del-total'

// La tarjeta del total donde el diseño la ubica (glosario: «Tarjeta del total»): su rótulo y el total del resumen (`totalDelResumen()`). Sus avisos («Total
// desactualizado», por qué falta) siguen en el resumen. Quién la esconde en el celular lo decide quien la ubica (`ItemDeHoja`).
export function TotalDeHoja({ item, contexto }: { item: Total; contexto: ContextoDeHoja }) {
  const total = totalDelResumen(contexto)
  return (
    <div data-tarjeta-del-total="pieza" className={TARJETA_EN_LA_SECCION}>
      <span className={ETIQUETA_DEL_TOTAL}>{item.etiqueta}</span>
      <strong data-total="pieza" className={CIFRA_DEL_TOTAL}>
        {total.tipo === 'valor' ? (
          <Monto valor={total.usd} moneda={MONEDA_DEL_PRIMER_RESULTADO} />
        ) : (
          '—'
        )}
      </strong>
    </div>
  )
}
