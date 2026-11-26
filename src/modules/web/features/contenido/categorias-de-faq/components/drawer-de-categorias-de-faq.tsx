'use client'

import { usosPorElemento, type CatalogoLeido } from '@/shared/lib/catalogo'
import {
  DrawerDeCatalogo,
  type OperacionesDelCatalogo,
  type TextosDelCatalogo,
} from '@/shared/ui/catalogo-en-drawer'
import { LARGO_DE_CATEGORIA } from '../../../../entities/contenido/categorias-de-faq'
import type { Faq } from '../../../../entities/contenido/faqs'
import { PANEL_DE_CATEGORIAS_DE_FAQ } from '../../../../entities/contenido/paneles'

// Lo que dice el drawer «Categorías» de las preguntas frecuentes (docs/GLOSARIO.md › Categoría de FAQ).
const TEXTOS: TextosDelCatalogo = {
  boton: 'Categorías',
  titulo: 'Categorías de las preguntas',
  descripcion:
    'Agrupan las preguntas en la web. Desactivar una la deja de ofrecer al elegir; las preguntas que la tienen la conservan.',
  elemento: 'categoría',
  articulo: 'la',
  item: { uno: 'pregunta', varios: 'preguntas', genero: 'f' },
  ninguno: 'Sin categoría',
  vacioTitulo: 'Todavía no hay categorías',
  vacioDescripcion: 'Créalas aquí o desde la pregunta.',
  tope: { sustantivo: 'categorías', articulo: 'las', orden: 'primeras por orden' },
  hechos: {
    agregado: 'Categoría agregada',
    renombrado: 'Categoría renombrada',
    activado: 'Categoría activada',
    desactivado: 'Categoría desactivada',
    quitado: 'Categoría quitada',
  },
}

type Props = {
  catalogo: CatalogoLeido & { operaciones: OperacionesDelCatalogo }
  // Las preguntas cargadas: cuántas tiene cada categoría (al quitar, la base cuenta también las que no se cargaron).
  faqs: readonly Faq[]
}

// «Categorías», junto a «Nueva pregunta»: el drawer `?panel=categorias` (`&quitar=<id>`) con el catálogo de categorías de FAQ.
export function DrawerDeCategoriasDeFaq({ catalogo, faqs }: Props) {
  return (
    <DrawerDeCatalogo
      panel={PANEL_DE_CATEGORIAS_DE_FAQ}
      catalogo={catalogo}
      usos={usosPorElemento(faqs, (faq) => faq.categoriaId)}
      operaciones={catalogo.operaciones}
      textos={TEXTOS}
      maximoDelNombre={LARGO_DE_CATEGORIA}
      motivoSinPermiso={null}
    />
  )
}
