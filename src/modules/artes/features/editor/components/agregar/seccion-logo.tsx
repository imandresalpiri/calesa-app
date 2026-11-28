'use client'

import { proporcionDe } from '../../../../entities/editor/agregar-en-el-panel'
import { rutaDelLogoDelLienzo } from '../../../../entities/medios'
import type { LogoDelEditor } from '../../../../entities/tipos'
import { BaldosaDeAgregar } from './baldosa-de-agregar'
import { SeccionDeAgregar, type PropsDeLaSeccion } from './seccion-de-agregar'
import { VistaPrevia } from './vista-previa'

type Props = PropsDeLaSeccion & { logos: readonly LogoDelEditor[] }

// «Logo» en «Agregar»: una baldosa por variante del logo de la empresa, con su vista previa servida por el mismo origen que usa el lienzo. Las
// variantes fijas no traen medidas: entran cuadradas (`proporcionDe()`).
export function SeccionLogo({ logos, motivo, alAgregar }: Props) {
  return (
    <SeccionDeAgregar titulo="Logo">
      {logos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La empresa todavía no tiene logo.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {logos.map((logo) => (
            <BaldosaDeAgregar
              key={logo.id}
              etiqueta={logo.nombre}
              motivo={motivo}
              alHacer={() => {
                alAgregar({ tipo: 'logo', varianteId: logo.id, proporcion: proporcionDe(logo) })
              }}
            >
              <VistaPrevia src={rutaDelLogoDelLienzo(logo.id)} />
            </BaldosaDeAgregar>
          ))}
        </ul>
      )}
    </SeccionDeAgregar>
  )
}
