import type { RetoquesDeLaTarjeta } from '../../../entities/cuadricula-de-la-tarjeta'
import type { ComponentType, ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import type { CeldaDeHoja, DisenoDeHoja } from '../../../entities/hoja'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import type { PropsDeLaTablaDeLaAyuda } from './tabla-de-la-ayuda'

// Los huecos de la hoja (4.15-6): lo que un área llena sin que el núcleo la importe. Son tipos y nada más: el núcleo (`features/hoja`) no importa ningún área, y las páginas
// de `src/app` unen los dos (`pantallas/<área>-<pantalla>.ts`). Un hueco vacío es un objeto sin componentes: la página no dibuja nada para él.

// Lo que le llega al `Proveedor` de un área: envuelve a la pantalla de la hoja (`<PantallaDeCotizar>` o `<PantallaDeUnaGuardada>`) y le da el `Ajuste` a `ContextoDelAjuste`.
// `cotizacionId` es nulo en la hoja nueva.
export type PropsDelProveedor = {
  children: ReactNode
  origenId: string
  cotizacionId: string | null
  permisos: Permisos
}

// Lo que recibe el panel de ajuste de una celda (el ⚙): la celda, cómo cerrarlo y lo que la hoja le da para «Aplicar también a esta cotización».
export type PropsDelAjuste = {
  celda: CeldaDeHoja
  cerrar: () => void
  hoja: {
    // De dónde calcula la hoja y la versión de la fórmula que dibuja.
    de: DeDondeCalcula
    formula: { id: string; version: number }
    // Cambiar la celda como si se tipeara, y volver a leer la hoja.
    alConfirmar: AccionesDeHoja['alConfirmar']
    alRecargar: () => void
  }
}

// Lo que recibe el panel del ⚙ de la cabecera (`?ajuste=cabecera`): si está abierto, cómo cerrarlo, el nombre del origen (sale de la base) y lo que la hoja le da para
// «Aplicar también a esta cotización»: su versión, su cabecera, lo elegido y cómo cambiarlo como si la persona lo eligiera.
export type PropsDelAjusteDeLaCabecera = {
  abierto: boolean
  cerrar: () => void
  origen: string
  hoja: {
    formula: { id: string; version: number }
    cabecera: DisenoDeHoja['cabecera']
    modoElegido: string | null
    verTotalBs: boolean
    soloLectura: boolean
    alElegirModo: (clave: string) => void
    alCambiarVerTotalBs: (valor: boolean) => void
  }
}

// El ajuste que la hoja monta cuando la URL nombra una celda con ⚙ (`?ajuste=celda&nodo=<id>`); nulo sin proveedor.
export type AjusteEnLaHoja = {
  Ajuste: ComponentType<PropsDelAjuste>
  nodo: string | null
  cerrar: () => void
  hoja: PropsDelAjuste['hoja']
}

// Lo que recibe el modal «Vista previa» de la tarjeta (4.18-2): si está abierto, cómo cerrarlo, la versión de la fórmula que dibuja la hoja (la tarjeta se lee por ella), los
// números que dibuja (los de la hoja nueva o, en una guardada, los guardados: P5), la moneda del total en Bs y, fuera de la tarjeta, lo que el modal dice: si lo de hoy no es lo
// guardado o hay cambios sin guardar. `estado` es el del recálculo de la hoja nueva: «Total desactualizado.» sólo se dice con él.
export type PropsDeLaVistaPrevia = {
  abierta: boolean
  cerrar: () => void
  formulaId: string
  calculo: CalculoDeLaTarjeta
  // Nulo en una guardada: lo guardado no se desactualiza.
  estado: EstadoDeRecalculo | null
  monedaBs: string | null
  avisos: { difiere: boolean; cambiosSinGuardar: boolean }
  // La hoja en par (glosario: «Cotizaciones hermanas»): la etiqueta de la opción de esta tarjeta (en la hoja nueva el título lleva « · <etiqueta>») y la tarjeta de la
  // otra opción, una bajo la otra en el orden de las opciones (`antes`: la de la hermana va primero). Lo de la página de la hermana pisa lo de esta.
  opcion?: string
  hermana?: HermanaEnLaVistaPrevia
}

export type HermanaEnLaVistaPrevia = {
  calculo: CalculoDeLaTarjeta
  estado: EstadoDeRecalculo | null
  opcion: string
  antes: boolean
  pagina?: {
    titulo: string | null
    numero: number
    guardadaEl: string
    retoques: RetoquesDeLaTarjeta | null
  }
}

// Lo que recibe la edición de una tabla desde la ayuda de una celda (el hueco `EdicionDeLaTabla`, que llena el área `tablas` con su proveedor; glosario: «Bloque de la
// ayuda»): la tabla viva (sólo a quien configura le llega su id), el rótulo de la celda (la nota de lo publicado: «Desde la ayuda de <rótulo>»), lo que la ayuda dibuja de
// ella (la de la hoja, con sus columnas y sus botones) y qué hacer al publicar: la hoja vuelve a pedir la página con la versión nueva (`'hoja'`) o relee la tabla (`'tabla'`:
// ninguna fórmula de este origen la usa, así que no hubo una versión siguiente).
export type PropsDeLaEdicionDeLaTabla = {
  tabla: { id: string; nombre: string }
  rotulo: string
  base: PropsDeLaTablaDeLaAyuda
  // «Editar en la configuración» (el enlace del núcleo), para la tabla que no se edita aquí (más de 2.000 filas o una que no se lee). Nulo sin el origen.
  enLaConfiguracion: ReactNode
  // La tabla tal cual (o su vacío), sin la edición: lo que se ve mientras llega el código de la edición o si no llega.
  quieta: ReactNode
  alPublicada: (publicacion: {
    version: number
    formulas: readonly { origenId: string }[]
  }) => 'hoja' | 'tabla'
}

export type HuecosDeLaHoja = {
  // El proveedor que enciende el ⚙ (4.20): sin él, ninguna celda lo dibuja.
  Proveedor?: ComponentType<PropsDelProveedor>
  // El enlace de «Falta publicar la fórmula» (de quien puede configurar): el del área `formula`.
  EnlaceSinPublicar?: ComponentType<{ origenId: string }>
}

// Lo que recibe un componente que un área llena en la guardada (`/cotizaciones/[id]`): la cotización, si quien mira la puede guardar (lo dice la base), sus permisos y
// el vehículo si quien mira lo ve (nulo si no tiene o no lo ve: la página ya lo leyó), para que el área decida qué dibuja. Cruza al navegador como props: sólo datos planos.
export type PropsDeUnHuecoDeLaGuardada = {
  cotizacion: CotizacionDeLaHoja
  puedeGuardar: boolean
  permisos: Permisos
  vehiculo: { id: string; titulo: string } | null
}

// Los huecos de una cotización guardada (4.15-6b): `Acciones`, lo que el área suma al «⋯» de la cabecera (`useAporteAlMenu()`: sus líneas, que ordena
// `accionesDeCotizacion()`) y sus diálogos, sin nada a la vista; `Debajo`, bajo la hoja; `Insignias` (4.27-4), en la cabecera después de la clase y de la vigencia;
// `BajoLaCabecera`, entre la cabecera y la hoja (la línea de «De este vehículo»). Los llenan `final`, `aprobada`, `comprobantes`, `comentarios` y `papelera`; la página de
// `src/app` los dibuja (`[id]/huecos-de-la-guardada.tsx`).
export type HuecosDeLaGuardada = {
  Acciones?: ComponentType<PropsDeUnHuecoDeLaGuardada>
  Insignias?: ComponentType<PropsDeUnHuecoDeLaGuardada>
  BajoLaCabecera?: ComponentType<PropsDeUnHuecoDeLaGuardada>
  Debajo?: ComponentType<PropsDeUnHuecoDeLaGuardada>
}

// El hueco del listado `/cotizaciones` (4.15-6b): `Junto` va en el grupo «Más» de «Vista y opciones» (el enlace a la papelera, 4.24). Lo llena `papelera`.
// `hayJunto` dice si quien mira lo vería: la página pasa `Junto` sólo entonces, así «Más» nunca queda vacío (`Junto` es un Server Component y el
// panel no puede saber si dibujó algo).
export type HuecosDelListado = {
  Junto?: ComponentType<{ permisos: Permisos }>
  hayJunto?: (permisos: Permisos) => boolean
}
