// Lo que se pasan las piezas del editor de artes (`editor-de-artes.tsx` arma todo y lo reparte por props: el lienzo, los paneles, el
// inspector y la barra no se conocen entre sí). El documento cambia sólo por `despachar` (el reducer puro de `entities/editor/estado.ts`);
// la cámara y la herramienta son del lienzo y no entran al historial.
import type { Ref } from 'react'
import type { PaginaDeArte, Punto } from '../../entities/documento'
import type { HerramientaDelEditor } from '../../entities/editor/atajos'
import type { Camara } from '../../entities/editor/camara'
import type { QueSeAgrega } from '../../entities/editor/capas-nuevas'
import type { AccionDelEstado, EstadoDelEditor } from '../../entities/editor/estado'
import type { PestanaIzquierda } from '../../entities/editor/paneles'
import type { ClaveDeFormato, Medidas } from '../../entities/formatos'
import type { LogoDelEditor, PlantillaDelEditor } from '../../entities/tipos'

// Lo que la página le pasa al editor (y a su marco en frío). `motivoDeSoloLectura`: por qué quien mira no puede cambiarla (nulo: puede).
// `personaId`: quien mira (el borrador local es suyo).
export type PropsDelEditorDeArtes = {
  plantilla: PlantillaDelEditor
  logos: readonly LogoDelEditor[]
  motivoDeSoloLectura: string | null
  personaId: string
}

// `useReducer`: estable entre dibujos.
export type Despachar = (accion: AccionDelEstado) => void

// El documento que se edita (la página 1), lo elegido y cómo cambiarlo. `medidas`: las de la plantilla, en unidades del formato.
export type EditorDeArte = {
  estado: EstadoDelEditor
  pagina: PaginaDeArte
  despachar: Despachar
  medidas: Medidas
  // Sin permiso para editar: se elige y se mira, nada cambia.
  soloLectura: boolean
}

// La cámara del lienzo (`use-camara.ts`): dónde está el documento en la pantalla. Funciones estables.
export type CamaraDelEditor = {
  camara: Camara
  fijar: (camara: Camara) => void
  // Que entre entero con su margen (`escalaParaAjustar`), y al 100 % centrado.
  ajustar: () => void
  alCien: () => void
  zoomAlPuntero: (puntero: Punto, factor: number) => void
  desplazar: (dx: number, dy: number) => void
}

export type ImagenPedida = { pixelRatio: number; tipo: 'image/png' | 'image/webp' }

// Lo que el editor le pide al lienzo fuera de un dibujo (un atajo, «Exportar PNG», guardar).
export type ManejoDelLienzo = {
  // Enter: termina el trazo de la pluma o empieza a editar el texto elegido. `true` si hizo algo.
  enter: () => boolean
  // Supr con un nodo de la pluma elegido: quita ese nodo (no la capa). `true` si hizo algo; si no, el editor quita lo elegido.
  quitar: () => boolean
  // Lo que se escribe encima del lienzo entra al documento (salir del campo lo termina). `true` si había un texto abierto.
  terminarElTexto: () => boolean
  // La imagen del documento sin la interfaz, con el Stage llevado a la identidad: «Exportar PNG» a su tamaño (`pixelRatio` 1, PNG) y la
  // miniatura de 480 px (`ladoDeLaMiniatura()`, WebP: Safari la da en PNG y quien sube mira `blob.type`). Espera las fuentes y las imágenes
  // (hasta `ESPERA_DE_LAS_IMAGENES_MS`); `faltan`, las que no cargaron. Nulo si el navegador no pudo armarla.
  imagen: (opciones: ImagenPedida) => Promise<{ blob: Blob; faltan: number } | null>
}

export type PropsDelLienzo = {
  ref?: Ref<ManejoDelLienzo>
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  herramienta: HerramientaDelEditor
  // Espacio apretado (o la herramienta «mano»): arrastrar desplaza.
  manoTransitoria: boolean
  // Al terminar de crear algo con una herramienta (texto, forma, línea, trazo): vuelve a «mover».
  alUsarHerramienta: () => void
  camara: CamaraDelEditor
  // El tamaño del área del lienzo en la pantalla (`use-tamano-del-lienzo.ts`).
  tamano: Medidas
}

export type PropsDeLasHerramientas = {
  herramienta: HerramientaDelEditor
  alElegir: (herramienta: HerramientaDelEditor) => void
  soloLectura: boolean
}

export type PropsDelPanelIzquierdo = {
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  pestana: PestanaIzquierda
  alCambiarPestana: (pestana: PestanaIzquierda) => void
  // Suma una capa en el centro de lo que se ve, la elige y vuelve a «mover». Apagado en sólo lectura o en el tope de capas.
  alAgregar: (que: QueSeAgrega) => void
  // Cambia en cada pedido de «Imagen» del riel: el panel muestra «Agregar» y lleva la biblioteca a la vista.
  pedidoDeLaBiblioteca: number
}

export type PropsDelInspector = {
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  // El de la plantilla, para nombrarlo en «Documento» («Vertical · 1080 × 1350»).
  formato: ClaveDeFormato
}
