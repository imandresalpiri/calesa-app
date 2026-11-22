import type { AccionDeMenu } from '@/shared/ui/lista'

type Alternativas = {
  alEditar: () => void
  alQuitar: () => void
}

// El «⋯» de una persona de la rueda: «Editar…» (la principal: la que abre tocar la tarjeta) y «Quitar de la rueda». Las dos abren algo encima (un modal), así
// que esperan a que el menú termine de cerrarse.
export function accionesDeLaPersona({ alEditar, alQuitar }: Alternativas): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar…',
      principal: true,
      despuesDeCerrar: true,
      alElegir: alEditar,
    },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar de la rueda',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: alQuitar,
    },
  ]
}
