import 'server-only'
import { repositorioPerfil } from '../../composicion'
import {
  CLAVE_DE_VENTANA_DE_CAMARA,
  VENTANA_POR_DEFECTO,
  ventanaDesde,
  type FichaDeQuienPresenta,
  type VentanaDeCamara,
} from '../../entities/ventana-de-camara'

const SIN_FICHA: FichaDeQuienPresenta = {
  nombre: '',
  cargo: null,
  cargoWeb: null,
  telefono: null,
  whatsapp: null,
}

// Lo que la ventana de cámara necesita de quien presenta: su ventana guardada (`live.ventana`) y lo suyo de `perfiles`, las dos por la PK y a la vez. Si
// una lectura falla, esa parte queda vacía o de fábrica: la ventana se dibuja igual (sin cargo ni teléfono) y nunca tumba el marco.
export async function leerLaVentanaDeCamara(
  usuarioId: string,
): Promise<{ ventana: VentanaDeCamara; ficha: FichaDeQuienPresenta }> {
  const [guardada, ficha] = await Promise.all([
    repositorioPerfil.leerPreferencia(usuarioId, CLAVE_DE_VENTANA_DE_CAMARA),
    repositorioPerfil.leerFichaDeQuienPresenta(usuarioId),
  ])
  return {
    ventana: guardada.ok ? ventanaDesde(guardada.data) : VENTANA_POR_DEFECTO,
    ficha: ficha.ok ? ficha.data : SIN_FICHA,
  }
}
