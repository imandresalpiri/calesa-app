'use client'

import { Button } from '../button'
import type { VariableDelEditor } from './tipos'

type Props = {
  variables: readonly VariableDelEditor[]
  // Las que el texto ya lleva (para marcar «Falta» en una obligatoria ausente).
  presentes: ReadonlySet<string>
  deshabilitado: boolean
  // Chicos y sólo con el nombre (la clave queda en el `title` y en el nombre accesible).
  compacto?: boolean
  alInsertar: (clave: string) => void
}

const CLASE_DEL_BOTON = 'h-auto min-h-[44px] flex-wrap gap-x-1.5 whitespace-normal md:min-h-8'
const CLASE_DEL_BOTON_COMPACTO =
  'h-auto min-h-[44px] gap-x-1 px-2 text-(length:--text-xs) whitespace-normal md:min-h-7'

// Un botón de variable por cada una que el texto acepta: inserta `{clave}` donde está el cursor. `onPointerDown` no le quita el foco a la
// `<textarea>` (la selección se queda donde estaba, también en el celular); el teclado entra por el clic. 44 px en el celular.
export function BotonesDeVariable({
  variables,
  presentes,
  deshabilitado,
  compacto = false,
  alInsertar,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Variables"
      className={compacto ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2'}
    >
      {variables.map((variable) => {
        const falta = variable.obligatoria === true && !presentes.has(variable.clave)
        return (
          <Button
            key={variable.clave}
            type="button"
            variant="outline"
            disabled={deshabilitado}
            aria-label={`Insertar ${variable.etiqueta} ({${variable.clave}})`}
            title={compacto ? `{${variable.clave}}` : undefined}
            className={compacto ? CLASE_DEL_BOTON_COMPACTO : CLASE_DEL_BOTON}
            onPointerDown={(evento) => {
              evento.preventDefault()
            }}
            onClick={() => {
              alInsertar(variable.clave)
            }}
          >
            <span>{variable.etiqueta}</span>
            {compacto ? null : (
              <code className="font-mono text-(length:--text-xs) text-(--color-ink-soft)">
                {`{${variable.clave}}`}
              </code>
            )}
            {falta ? (
              <span className="text-(length:--text-xs) font-medium text-(--color-peligro-ink)">
                Falta
              </span>
            ) : null}
          </Button>
        )
      })}
    </div>
  )
}
