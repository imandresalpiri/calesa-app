'use client'

import { COLOR_AUTOMATICO } from '../../../../../entities/cuadricula-de-la-tarjeta'
import { contrasteDeLaTarjeta } from '../../../../../entities/colores'
import type { TonoDelCatalogo } from '../../../../../entities/plantilla/lectura-de-la-plantilla'

// El aviso suave de contraste de la tarjeta (el de «Orígenes › Colores»): nunca frena.
export const AVISO_DE_CONTRASTE = 'Con este color el texto de la tarjeta se lee con dificultad.'

type Props = {
  etiqueta: string
  // La clave elegida, `auto`, o nula si las celdas elegidas tienen colores distintos.
  valor: string | null
  tonos: readonly TonoDelCatalogo[]
  alElegir: (clave: string) => void
  // En el fondo, el aviso de contraste del color elegido.
  conAviso?: boolean
}

// «Fondo» o «Texto»: «Automático» y los colores del catálogo (`tonos`, «Orígenes › Colores») como muestras que se eligen (`radiogroup`). Un color sin hex no se ofrece.
export function CampoDelColor({ etiqueta, valor, tonos, alElegir, conAviso = false }: Props) {
  const conHex = tonos.filter((t) => t.hex !== undefined)
  const elegido = conHex.find((t) => t.clave === valor)
  const aviso = conAviso && elegido?.hex !== undefined && contrasteDeLaTarjeta(elegido.hex).aviso
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-(length:--text-sm) font-medium">{etiqueta}</span>
      <div role="radiogroup" aria-label={etiqueta} className="flex min-w-0 flex-wrap gap-1">
        <button
          type="button"
          role="radio"
          aria-checked={valor === COLOR_AUTOMATICO}
          onClick={() => {
            alElegir(COLOR_AUTOMATICO)
          }}
          className="inline-flex min-h-11 items-center rounded-(--radius-sm) border border-(--color-line-strong) px-2 text-(length:--text-xs) outline-none focus-visible:shadow-(--shadow-focus) aria-checked:ring-2 aria-checked:ring-(--color-primario) md:min-h-8"
        >
          Automático
        </button>
        {conHex.map((t) => (
          <button
            key={t.clave}
            type="button"
            role="radio"
            aria-checked={valor === t.clave}
            aria-label={t.nombre}
            title={t.nombre}
            data-color={t.clave}
            onClick={() => {
              alElegir(t.clave)
            }}
            className="size-[44px] rounded-(--radius-sm) border border-(--color-line-strong) outline-none focus-visible:shadow-(--shadow-focus) aria-checked:ring-2 aria-checked:ring-(--color-primario) aria-checked:ring-offset-1 md:size-8"
            style={{ background: t.hex }}
          />
        ))}
      </div>
      {aviso ? (
        <p className="text-(length:--text-xs) text-(--color-aviso-ink)" data-aviso-de-contraste="">
          {AVISO_DE_CONTRASTE}
        </p>
      ) : null}
    </div>
  )
}
