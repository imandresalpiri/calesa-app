// Los avisos de la copia (docs/GLOSARIO.md): lo que `formula_del_origen_crear()` cambió o no pudo resolver al copiar una fórmula de otro origen. Viajan de la
// action a la planilla por `sessionStorage` (una vez, por id de la fórmula) y los datos del vehículo que faltan quedan además marcados en sus filas.
import { z } from 'zod'
import { textoDelCampoQueFalta } from './campos-que-faltan'

export const esquemaDeUnAviso = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('tabla_del_destino'), clave: z.string().min(1) }),
  z.object({ tipo: z.literal('tabla_creada'), clave: z.string().min(1) }),
  z.object({ tipo: z.literal('campo'), nodo: z.string().min(1), campo: z.string().min(1) }),
])

export type AvisoDeLaCopia = z.infer<typeof esquemaDeUnAviso>

export const esquemaDeLosAvisos = z.array(esquemaDeUnAviso).max(500)

// La clave de `sessionStorage` de los avisos de una fórmula recién creada.
export const claveDeLosAvisos = (formulaId: string) => `avisos-de-la-copia:${formulaId}`

export type TextoDeUnAviso = { clave: string; texto: string; tablas: boolean }

// Lo que se lee: uno por aviso, en el orden de la base. `tablas` dice si lleva el enlace a el drawer de las tablas.
export function textosDeLosAvisos(avisos: readonly AvisoDeLaCopia[]): TextoDeUnAviso[] {
  return avisos.map((aviso, i) => {
    switch (aviso.tipo) {
      case 'tabla_del_destino':
        return {
          clave: `${String(i)}:${aviso.clave}`,
          texto: `Se usó la tabla «${aviso.clave}» de este origen.`,
          tablas: true,
        }
      case 'tabla_creada':
        return {
          clave: `${String(i)}:${aviso.clave}`,
          texto: `Se creó la tabla «${aviso.clave}» con las filas de la copia.`,
          tablas: true,
        }
      case 'campo':
        return {
          clave: `${String(i)}:${aviso.nodo}`,
          texto: textoDelCampoQueFalta(aviso.campo),
          tablas: false,
        }
    }
  })
}

// Lo guardado en `sessionStorage`, leído sin confiar: lo que no tiene la forma no se muestra.
export function avisosGuardados(texto: string | null): AvisoDeLaCopia[] {
  if (texto === null) return []
  try {
    const leidos = esquemaDeLosAvisos.safeParse(JSON.parse(texto))
    return leidos.success ? leidos.data : []
  } catch {
    return []
  }
}
