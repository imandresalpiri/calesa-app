import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { conRed, errorDeCampo, resultadoDeAccion } from '@/shared/lib/formularios'

// Lo que responde la Server Action «crear» de un catálogo (`executeAsync` de su `useAction`).
export type RespuestaDeCrear = {
  serverError?: ErrorApp
  data?: Resultado<ElementoDeCatalogo>
  validationErrors?: { fieldErrors?: Partial<Record<string, string[]>> }
}

// El `alCrear` del combo a partir de la action «crear» de un módulo. Un nombre que no pasa la validación dice su motivo («Escribe un
// nombre.»), no «Revisa los campos marcados.»: el combo no tiene otros campos.
export function crearDesdeAccion(
  enviar: (nombre: string) => Promise<RespuestaDeCrear | undefined>,
): (nombre: string) => Promise<Resultado<ElementoDeCatalogo>> {
  return async (nombre) => {
    const respuesta = await conRed(enviar(nombre))
    const motivo =
      'validationErrors' in respuesta
        ? errorDeCampo(respuesta.validationErrors?.fieldErrors, 'nombre')
        : undefined
    return motivo ? fallo('validacion', motivo) : resultadoDeAccion(respuesta)
  }
}
