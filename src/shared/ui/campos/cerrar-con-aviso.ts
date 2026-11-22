import type { CodigoError, Resultado } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'

// Lo que nunca va en un toast: ya está escrito al lado de su campo (un error de validación o un nombre repetido).
const JUNTO_AL_CAMPO: readonly CodigoError[] = ['validacion', 'duplicado']

// Cierra un envío: lo logrado se avisa y lo que falló también, salvo lo que ya está escrito al lado de su campo y lo que `callar` dice
// que la pantalla muestra por su cuenta (un conflicto con «Recargar»). Lo tipeado queda siempre.
export function cerrarConAviso<Dato>(
  resultado: Resultado<Dato>,
  exito: string | null,
  callar: readonly CodigoError[] | 'todo' = [],
): Resultado<Dato> {
  if (resultado.ok) {
    if (exito !== null) {
      avisarExito(exito)
    }
    return resultado
  }
  const { codigo } = resultado.error
  const callado = callar === 'todo' || callar.includes(codigo) || JUNTO_AL_CAMPO.includes(codigo)
  if (!callado) {
    avisarError(resultado.error)
  }
  return resultado
}
