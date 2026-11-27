import { huecoDelPanel, type GrupoDeLogistica, type HuecoDelGrupo } from '@/modules/logistica'
import { DrawerDelHueco } from '@/modules/logistica/pantallas/transporte'

// El hueco que pide `?panel=grupo-<clave>` (subir un documento a los vehículos, prorratear un gasto), en su drawer, sobre el embarque o el contenedor `grupo`. Sólo uno de los que la
// persona puede usar ahí (`huecosDelMenu`): una URL a mano con otro no abre nada.
export function HuecoAbierto({
  panel,
  huecos,
  grupo,
  descripcion,
}: {
  panel: string | undefined
  huecos: readonly HuecoDelGrupo[]
  grupo: GrupoDeLogistica
  descripcion: string
}) {
  const clave = huecoDelPanel(panel)
  const hueco = clave === null ? undefined : huecos.find((h) => h.clave === clave)
  if (hueco === undefined) return null
  const Componente = hueco.componente
  return (
    <DrawerDelHueco clave={hueco.clave} titulo={hueco.titulo} descripcion={descripcion}>
      <Componente grupo={grupo} />
    </DrawerDelHueco>
  )
}
