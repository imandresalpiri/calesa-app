'use client'

import { FOTOS_DE_EJEMPLO, TARJETA_DE_EJEMPLO } from '../../../../entities/editor/datos-de-ejemplo'
import { BaldosaDeAgregar } from './baldosa-de-agregar'
import { SeccionDeAgregar, type PropsDeLaSeccion } from './seccion-de-agregar'
import { VistaPrevia } from './vista-previa'

// «De la cotización» en «Agregar»: la tarjeta de la cotización y las fotos del vehículo, con las imágenes de ejemplo mientras se diseña; al
// compartir se llenan con las de verdad.
export function SeccionDeLaCotizacion({ motivo, alAgregar }: PropsDeLaSeccion) {
  return (
    <SeccionDeAgregar titulo="De la cotización">
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">
        Se llenan con el vehículo y la cotización que compartas.
      </p>
      <ul className="grid grid-cols-2 gap-2">
        <BaldosaDeAgregar
          etiqueta="Tarjeta de la cotización"
          motivo={motivo}
          alHacer={() => {
            alAgregar({ tipo: 'tarjeta' })
          }}
        >
          <VistaPrevia src={TARJETA_DE_EJEMPLO.src} />
        </BaldosaDeAgregar>
        {FOTOS_DE_EJEMPLO.map((foto, indice) => (
          <BaldosaDeAgregar
            key={foto.src}
            etiqueta={`Foto ${String(indice + 1)}`}
            motivo={motivo}
            alHacer={() => {
              alAgregar({ tipo: 'foto', indice })
            }}
          >
            <VistaPrevia src={foto.src} />
          </BaldosaDeAgregar>
        ))}
      </ul>
    </SeccionDeAgregar>
  )
}
