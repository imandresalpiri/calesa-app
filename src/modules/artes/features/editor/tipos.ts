// Lo que se pasan las piezas del editor de artes (`editor-de-artes.tsx` arma todo y lo reparte por props: el lienzo, los paneles, el
// inspector y la barra no se conocen entre sí). El documento cambia sólo por `despachar` (el reducer puro de `entities/editor/estado.ts`);
// la cámara y la herramienta son del lienzo y no entran al historial.
import type { Ref } from 'react'
import type { CapasConDatos, Falta } from '../../entities/datos/capas-con-datos'
import type { DatosDelArte, FijosDelArte, TipoDeOrigenDelArte } from '../../entities/datos/tipos'
import type { ValoresDelArte } from '../../entities/datos/valores-del-arte'
import type { CampoDelArte, CatalogoDelArte } from '../../entities/datos/variables-del-arte'
import type { PaginaDeArte, Punto } from '../../entities/documento'
import type { HerramientaDelEditor } from '../../entities/editor/atajos'
import type { Camara } from '../../entities/editor/camara'
import type { QueSeAgrega } from '../../entities/editor/capas-nuevas'
import type { AccionDelEstado, EstadoDelEditor } from '../../entities/editor/estado'
import type { PestanaIzquierda } from '../../entities/editor/paneles'
import type { ClaveDeFormato, Medidas, TipoDeArte } from '../../entities/formatos'
import type { LogoDelEditor, PlantillaDelEditor } from '../../entities/tipos'
import type { FuentesDelLienzo } from './hooks/use-fuentes-listas'

// El origen de la plantilla: su tipo decide qué datos aplican y sus campos (los del layout, activos o no) dan los `{ficha.<clave>}`.
export type OrigenDelEditor = {
  id: string
  nombre: string
  tipo: TipoDeOrigenDelArte
  campos: readonly CampoDelArte[]
}

// Qué ve quien mira de los clientes con el Modo Live encendido (`ajustes.clientes` del Live; `completo` con el Live apagado): `apagado`, ningún
// nombre de lead real (ni en el lienzo ni para elegir).
export type LiveDelCliente = 'apagado' | 'nombres' | 'completo'

// Lo que la página le pasa al editor (y a su marco en frío). `motivoDeSoloLectura`: por qué quien mira no puede cambiarla (nulo: puede).
// `personaId`: quien mira (el borrador local y el vehículo de ejemplo recordado son suyos). Los `motivo…`: por qué no puede cambiar ese texto o
// elegir un vehículo (nulo: puede).
export type PropsDelEditorDeArtes = {
  plantilla: PlantillaDelEditor
  logos: readonly LogoDelEditor[]
  motivoDeSoloLectura: string | null
  personaId: string
  origen: OrigenDelEditor
  // El texto base del origen; nulo si no se pudo leer (se ve el inicial de su tipo y guardar crea la fila).
  textoBase: { texto: string; actualizadoEn: string } | null
  motivoDelTextoBase: string | null
  portal: { mensaje: string | null; actualizadoEn: string | null }
  motivoDelPortal: string | null
  // Quien comparte (el asesor que mira) y la empresa: los mismos con los datos de ejemplo y con un vehículo elegido.
  fijos: FijosDelArte
  // Sin `vehiculos.ver` en el origen: «No ves los vehículos de <origen>: el arte usa los datos de ejemplo.».
  motivoDelEjemplo: string | null
  liveDelCliente: LiveDelCliente
}

// Los datos con que se ve la plantilla (`use-datos-del-editor.ts`): qué `{clave}` conoce el arte en este origen, los datos del vehículo de
// ejemplo (o los de ejemplo), sus valores ya escritos, la página elegida resuelta, lo que falta y las variables desconocidas de todo el
// documento.
export type DatosEnElEditor = {
  origen: OrigenDelEditor
  catalogo: CatalogoDelArte
  datos: DatosDelArte
  valores: ValoresDelArte
  // El Modo Live: los montos sin su moneda.
  sinMoneda: boolean
  conDatos: CapasConDatos
  // Lo que le falta al documento (todas sus páginas) con el vehículo elegido (también lo que no cargó); con los datos de ejemplo, nada.
  faltan: readonly Falta[]
  // Mientras haya una, la plantilla de arte no se guarda.
  desconocidas: readonly string[]
}

// `useReducer`: estable entre dibujos.
export type Despachar = (accion: AccionDelEstado) => void

// El documento que se edita, la página elegida (la del lienzo), lo elegido y cómo cambiarlo. `medidas`: las de la plantilla, en unidades del
// formato.
export type EditorDeArte = {
  estado: EstadoDelEditor
  pagina: PaginaDeArte
  // Todas las páginas, en orden, y el índice de la elegida.
  paginas: readonly PaginaDeArte[]
  indice: number
  despachar: Despachar
  medidas: Medidas
  // El tipo del formato de la plantilla: un PDF tiene páginas, sólo Geist, y ni sombras ni contorno de texto.
  tipo: TipoDeArte
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

// Lo que la miniatura de la página 1 de la tira le da al editor: su imagen, como la del lienzo (la miniatura de la plantilla de arte sale de
// la página 1 aunque el lienzo muestre otra).
export type ManejoDeLaMiniatura = Pick<ManejoDelLienzo, 'imagen'>

export type PropsDelLienzo = {
  ref?: Ref<ManejoDelLienzo>
  editor: EditorDeArte
  // La página con los datos del vehículo de ejemplo (`capasConDatos()`): lo que dibuja cada capa y cuáles se esconden.
  conDatos: CapasConDatos
  herramienta: HerramientaDelEditor
  // Espacio apretado (o la herramienta «mano»): arrastrar desplaza.
  manoTransitoria: boolean
  // Al terminar de crear algo con una herramienta (texto, forma, línea, trazo): vuelve a «mover».
  alUsarHerramienta: () => void
  camara: CamaraDelEditor
  // El tamaño del área del lienzo en la pantalla (`use-tamano-del-lienzo.ts`).
  tamano: Medidas
  // Las fuentes del documento (`useFuentesListas`), las mismas que usan las miniaturas de la tira de páginas.
  fuentes: FuentesDelLienzo
}

export type PropsDeLasHerramientas = {
  herramienta: HerramientaDelEditor
  alElegir: (herramienta: HerramientaDelEditor) => void
  soloLectura: boolean
}

export type PropsDelPanelIzquierdo = {
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  datos: DatosEnElEditor
  pestana: PestanaIzquierda
  alCambiarPestana: (pestana: PestanaIzquierda) => void
  // Suma una capa en el centro de lo que se ve, la elige y vuelve a «mover». Apagado en sólo lectura o en el tope de capas.
  alAgregar: (que: QueSeAgrega) => void
  // Cambia en cada pedido de «Imagen» del riel: el panel muestra «Agregar» y lleva la biblioteca a la vista.
  pedidoDeLaBiblioteca: number
  // Para la tira de páginas de un PDF: las fuentes del documento y la miniatura de la página 1.
  fuentes: FuentesDelLienzo
  primera: Ref<ManejoDeLaMiniatura>
}

// Lo que la pestaña «Textos» recibe de la página tal cual: el texto base del origen y el Mensaje del portal, con sus motivos.
export type TextosDelEditor = Pick<
  PropsDelEditorDeArtes,
  'textoBase' | 'motivoDelTextoBase' | 'portal' | 'motivoDelPortal'
>

export type PropsDelInspector = {
  editor: EditorDeArte
  logos: readonly LogoDelEditor[]
  datos: DatosEnElEditor
  textos: TextosDelEditor
  // El de la plantilla, para nombrarlo en «Documento» («Vertical · 1080 × 1350»).
  formato: ClaveDeFormato
}
