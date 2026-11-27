import {
  leerAjustes,
  leerEnlacesDeAyuda,
  leerLogos,
  urlDeIcono,
  zonasHorarias,
} from '@/modules/empresa'
import { TarjetasDeLaEmpresa } from '@/modules/empresa/pantallas/configuracion-empresa'
import { urlPublica, urlPublicaONull } from '@/shared/lib/almacen'
import { datosO } from '@/shared/lib/errores'

// Lo que dibuja Datos de la empresa: siete tarjetas con lo guardado, que se editan en un modal cada una. La lee cualquiera que llegue a la
// pantalla; quien no tiene `empresa.ajustes.gestionar` la ve con «Editar» apagado y el motivo. Sin `key`: las tarjetas y sus modales
// reciben lo guardado por props y cada modal arranca de cero en cada apertura.
export async function SeccionEmpresa({ puedeEditar }: { puedeEditar: boolean }) {
  const [leidos, enlaces, logos] = await Promise.all([
    leerAjustes(),
    leerEnlacesDeAyuda(),
    leerLogos(),
  ])
  const { ajustes } = datosO(leidos)

  return (
    <TarjetasDeLaEmpresa
      ajustes={ajustes}
      logoUrl={urlPublicaONull('marca', ajustes.logoRuta)}
      logoOscuroUrl={urlPublicaONull('marca', ajustes.logoOscuroRuta)}
      iconoActualUrl={urlDeIcono(ajustes.iconos, '192', (ruta) => urlPublica('marca', ruta))}
      zonas={zonasHorarias()}
      puedeEditar={puedeEditar}
      enlacesDeAyuda={datosO(enlaces)}
      logos={datosO(logos)}
    />
  )
}
