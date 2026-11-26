'use client'

import { Drawer } from '@/shared/ui/drawer'
import { FUNCIONES_DE_LA_AYUDA } from '../../../../../entities/formula/ayuda-de-funciones'
import type { Planilla } from '../../../hooks/use-planilla'

const TECLAS: readonly (readonly [string, string])[] = [
  ['F2, doble clic o una tecla', 'Escribe en la celda elegida.'],
  ['Enter / Tab', 'Aplica y pasa a la celda de abajo o de la derecha.'],
  ['Esc', 'Descarta lo escrito.'],
  ['Alt + ↑ / ↓', 'Mueve la fila.'],
  ['Supr', 'Pone un valor fijo en 0 (no borra la fila).'],
  ['Clic derecho', 'Abre el menú de la fila.'],
]

const TITULO = 'mb-2 font-semibold text-(--color-ink)'
const CODIGO = 'rounded-(--radius-sm) bg-(--color-surface-2) px-1 font-mono'

// «¿Cómo se escribe?» (`?panel=como-se-escribe`, D5): las referencias A1, las diez funciones con su firma y un ejemplo, y las teclas de la planilla. Sólo lectura.
export function PanelComoSeEscribe({ planilla }: { planilla: Planilla }) {
  const { ayuda } = planilla.paneles
  return (
    <Drawer abierto={ayuda.abierto} alCerrar={ayuda.cerrar} titulo="¿Cómo se escribe?">
      <div className="grid min-w-0 gap-6 text-(length:--text-sm)">
        <section aria-labelledby="como-se-escribe-referencias">
          <h3 id="como-se-escribe-referencias" className={TITULO}>
            Referencias
          </h3>
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>
              Un cálculo empieza con <code className={CODIGO}>=</code> y nombra celdas:{' '}
              <code className={CODIGO}>=C5+C7*B9</code>.
            </li>
            <li>Mientras escribes, un clic en una celda inserta su referencia.</li>
            <li>
              Un rango como <code className={CODIGO}>C5:C9</code> va sólo dentro de SUMA, MAX o MIN.
            </li>
            <li>
              Una fórmula usa sólo filas de arriba. Al mover filas, las referencias se reescriben
              solas.
            </li>
            <li>Los valores de una función se separan con punto y coma.</li>
          </ul>
        </section>
        <section aria-labelledby="como-se-escribe-funciones">
          <h3 id="como-se-escribe-funciones" className={TITULO}>
            Funciones
          </h3>
          <dl className="grid gap-3">
            {FUNCIONES_DE_LA_AYUDA.map((f) => (
              <div key={f.nombre} className="grid min-w-0 gap-0.5">
                <dt className="font-mono font-semibold break-words text-(--color-ink)">
                  {f.firma}
                </dt>
                <dd className="text-(--color-ink-soft)">{f.frase}</dd>
                <dd>
                  <code className={`${CODIGO} break-all`}>{f.ejemplo}</code>
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="como-se-escribe-teclas">
          <h3 id="como-se-escribe-teclas" className={TITULO}>
            Teclas
          </h3>
          <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
            {TECLAS.map(([tecla, que]) => (
              <div key={tecla} className="contents">
                <dt className="font-medium text-(--color-ink)">{tecla}</dt>
                <dd className="text-(--color-ink-soft)">{que}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Drawer>
  )
}
