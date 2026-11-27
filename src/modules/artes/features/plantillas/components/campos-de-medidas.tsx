'use client'

import { Campo } from '@/shared/ui/campo'
import { formatoDe, MENSAJE_DEL_LADO_PERSONALIZADO } from '../../../entities/formatos'
import { CAMPO_DEL_ALTO, CAMPO_DEL_ANCHO, type NuevaPlantilla } from '../hooks/use-nueva-plantilla'

// Ancho y alto de «Nueva plantilla», siempre a la vista: con un formato fijo muestran sus medidas apagadas; con «Personalizado» se escriben, y
// la línea de abajo (reservada) dice el rango. Elegir otro formato no mueve nada. Comparten su motivo, que va bajo el ancho.
export function CamposDeMedidas({ formulario }: { formulario: NuevaPlantilla }) {
  const formato = formatoDe(formulario.formato)
  const lado = (cual: 'ancho' | 'alto') =>
    formulario.personalizado ? formulario[cual] : String(formato[cual] ?? '')
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-2 gap-3">
        <Campo
          nombre={CAMPO_DEL_ANCHO}
          etiqueta={`Ancho (${formato.unidad})`}
          inputMode="numeric"
          autoComplete="off"
          disabled={!formulario.personalizado}
          value={lado('ancho')}
          onChange={(evento) => {
            formulario.escribirLado('ancho', evento.target.value)
          }}
          error={formulario.errores[CAMPO_DEL_ANCHO]}
        />
        <Campo
          nombre={CAMPO_DEL_ALTO}
          etiqueta={`Alto (${formato.unidad})`}
          inputMode="numeric"
          autoComplete="off"
          disabled={!formulario.personalizado}
          value={lado('alto')}
          onChange={(evento) => {
            formulario.escribirLado('alto', evento.target.value)
          }}
        />
      </div>
      <p className="min-h-5 text-(length:--text-sm) text-(--color-ink-faint)">
        {formulario.personalizado ? MENSAJE_DEL_LADO_PERSONALIZADO : null}
      </p>
    </div>
  )
}
