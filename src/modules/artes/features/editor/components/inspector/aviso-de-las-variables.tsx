'use client'

// La línea de abajo de «Texto» en el inspector del editor de artes, de alto fijo: cómo se escriben los datos (`{marca}`) o, si el texto lleva
// una variable que el arte no puede llenar, el aviso («{x} no es un dato que el arte pueda llenar.»).
import {
  textoDeVariablesDesconocidas,
  variablesDesconocidas,
} from '../../../../entities/editor/variables'

const AYUDA_DE_LOS_DATOS = 'Los datos van entre llaves, como {marca} o {modelo}.'

export function AvisoDeLasVariables({ texto }: { texto: string }) {
  const aviso = textoDeVariablesDesconocidas(variablesDesconocidas(texto))
  return (
    <p
      role="status"
      className={
        aviso
          ? 'min-h-8 text-(length:--text-xs) leading-4 text-(--color-aviso-ink)'
          : 'min-h-8 text-(length:--text-xs) leading-4 text-(--color-ink-faint)'
      }
    >
      {aviso ?? AYUDA_DE_LOS_DATOS}
    </p>
  )
}
