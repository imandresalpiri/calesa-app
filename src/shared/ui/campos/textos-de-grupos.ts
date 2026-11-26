import type { TextosDelCatalogo } from '@/shared/ui/catalogo-en-drawer'

// El valor de `?panel=` del drawer «Grupos» del editor de campos (`&quitar=<id>` para quitar uno).
export const PANEL_DE_GRUPOS = 'grupos'

// Lo que dice el drawer «Grupos», el mismo en los leads y en un origen (docs/GLOSARIO.md › Grupo de campos).
export const TEXTOS_DE_GRUPOS: TextosDelCatalogo = {
  boton: 'Grupos',
  titulo: 'Grupos de campos',
  descripcion:
    'Ordenan el formulario y la ficha en bloques. Desactivar uno lo deja de ofrecer al elegir; los campos que lo tienen lo conservan.',
  elemento: 'grupo',
  articulo: 'el',
  item: { uno: 'campo', varios: 'campos', genero: 'm' },
  ninguno: 'Sin grupo',
  vacioTitulo: 'Todavía no hay grupos',
  vacioDescripcion: 'Créalos aquí o desde el campo.',
  tope: { sustantivo: 'grupos', articulo: 'los', orden: 'primeros por orden' },
  hechos: {
    agregado: 'Grupo agregado',
    renombrado: 'Grupo renombrado',
    activado: 'Grupo activado',
    desactivado: 'Grupo desactivado',
    quitado: 'Grupo quitado',
  },
}
