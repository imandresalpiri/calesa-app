import { Aviso } from '@/shared/ui/aviso'

export const FORMULA_NO_ENCONTRADA =
  'Esa fórmula no es de este origen o ya no existe: te mostramos la de trabajo.'

// Lo que se dice arriba cuando `?formula=` nombra una que no se abrió (de otro origen, borrada o un id que no es): se dibuja la de trabajo.
export function FormulaNoEncontrada() {
  return (
    <Aviso tono="aviso">
      <p>{FORMULA_NO_ENCONTRADA}</p>
    </Aviso>
  )
}
