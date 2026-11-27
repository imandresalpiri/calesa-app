import { Suspense } from 'react'
import { leerAjustesDelSitio, leerDireccionPublica, redesConEtiqueta } from '@/modules/web'
import { PuertaDeLaVentana, leerLaVentanaDeCamara } from '@/modules/equipo/shell'
import { urlPublicaONull } from '@/shared/lib/almacen'

type Props = {
  usuarioId: string
  // Si el servidor dibuja esta pantalla con el Live encendido (la cookie): sin él no se lee nada y la puerta no pide el código de la ventana.
  enElLive: boolean
  empresa: { nombre: string; logoRuta: string | null; logoOscuroRuta: string | null }
}

// Las redes y la web de la empresa que muestra la ventana: las de Sitio web › Ajustes. Si no se pueden leer, sin ellas.
async function redesYWebDeLaEmpresa() {
  const [ajustes, direccion] = await Promise.all([leerAjustesDelSitio(), leerDireccionPublica()])
  return {
    redes: ajustes.ok ? redesConEtiqueta(ajustes.data.redes) : [],
    web: direccion.ok ? direccion.data : null,
  }
}

async function VentanaLeida({ usuarioId, empresa }: Omit<Props, 'enElLive'>) {
  const [{ ventana, ficha }, { redes, web }] = await Promise.all([
    leerLaVentanaDeCamara(usuarioId),
    redesYWebDeLaEmpresa(),
  ])
  return (
    <PuertaDeLaVentana
      ventana={{
        inicial: ventana,
        datos: {
          ...ficha,
          empresa: {
            nombre: empresa.nombre,
            logoUrl: urlPublicaONull('marca', empresa.logoRuta),
            logoOscuroUrl: urlPublicaONull('marca', empresa.logoOscuroRuta),
            redes,
            web,
          },
        },
      }}
    />
  )
}

// El hueco de la ventana de cámara del Modo Live (docs/GLOSARIO.md › «Ventana de cámara»): sólo con el Live encendido lee lo suyo (su ventana guardada, su
// ficha, el logo y las redes), por su cuenta y detrás de su <Suspense>: no demora el resto de la pantalla. Con el Live apagado no lee nada ni dibuja nada.
export function HuecoVentanaDeCamara({ enElLive, ...resto }: Props) {
  if (!enElLive) {
    return null
  }
  return (
    <Suspense fallback={null}>
      <VentanaLeida {...resto} />
    </Suspense>
  )
}
