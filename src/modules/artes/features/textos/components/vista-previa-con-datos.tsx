'use client'

import { useId, useMemo } from 'react'
import { resolverTexto } from '../../../entities/datos/resolver-texto'
import type { DatosDelArte } from '../../../entities/datos/tipos'
import { valoresDelArte } from '../../../entities/datos/valores-del-arte'
import type { CatalogoDelArte } from '../../../entities/datos/variables-del-arte'

type Props = {
  texto: string
  catalogo: CatalogoDelArte
  datos: DatosDelArte
  sinMoneda: boolean
}

// El texto base resuelto con los datos del ejemplo del lienzo, como saldría al compartir: cada `{clave}` con su valor y la línea de una que
// queda vacía, quitada (`resolverTexto()`, el mismo del lienzo y de compartir). Caja de alto fijo con su desplazamiento: escribir no la agranda.
export function VistaPreviaConDatos({ texto, catalogo, datos, sinMoneda }: Props) {
  const idEtiqueta = useId()
  const valores = useMemo(
    () => valoresDelArte(datos, { sinMoneda, catalogo }),
    [datos, sinMoneda, catalogo],
  )
  const resuelto = resolverTexto(texto, valores, catalogo)
  const conQue = datos.deEjemplo || !datos.vehiculo ? 'los datos de ejemplo' : datos.vehiculo.titulo
  const vacio = resuelto.texto.trim() === ''
  return (
    <div className="grid gap-1.5">
      <p id={idEtiqueta} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Vista previa con {conQue}
      </p>
      <div
        role="group"
        aria-labelledby={idEtiqueta}
        className="h-48 overflow-y-auto rounded-(--radius-md) bg-(--color-surface-2) p-3 text-(length:--text-sm) break-words whitespace-pre-wrap text-(--color-ink)"
      >
        {vacio ? (
          <span className="text-(--color-ink-faint)">
            Con estos datos no queda nada que mostrar.
          </span>
        ) : (
          resuelto.texto
        )}
      </div>
    </div>
  )
}
