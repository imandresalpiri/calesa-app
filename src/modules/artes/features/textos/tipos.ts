import type { DatosDelArte, TipoDeOrigenDelArte } from '../../entities/datos/tipos'
import type { CatalogoDelArte } from '../../entities/datos/variables-del-arte'

// Lo que la pestaña «Textos» del editor de artes recibe de la página: el texto base del origen y el Mensaje del portal, cada uno con su versión
// y, si quien mira no puede cambiarlo, su motivo (de sólo lectura).
export type PropsDelPanelDeTextos = {
  origen: { id: string; nombre: string; tipo: TipoDeOrigenDelArte }
  catalogo: CatalogoDelArte
  // La fila del origen; null si no se pudo leer (el texto inicial del tipo, y guardar la crea).
  textoBase: { texto: string; actualizadoEn: string } | null
  motivoDelTextoBase: string | null
  portal: { mensaje: string | null; actualizadoEn: string | null }
  motivoDelPortal: string | null
  // Los del ejemplo que se ve en el lienzo (de ejemplo o reales) y el Modo Live: la vista previa los usa.
  datos: DatosDelArte
  sinMoneda: boolean
}
