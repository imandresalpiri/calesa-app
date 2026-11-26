import { textoDelCliente, type ClienteDeLaCabecera } from '@/modules/repuestos'
import { TarjetaDeVehiculoYClienteDiferida } from '@/modules/repuestos/pantallas/items-del-panel'
import type { Vehiculo } from '@/modules/vehiculos'
import type { Resultado } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { Skeleton } from '@/shared/ui/skeleton'
import { ERROR_DEL_VEHICULO } from './vehiculo-del-proyecto'

type Props = {
  // La lectura del vehículo que la página ya empezó para la cabecera (nula: proyecto externo). Aquí sólo se espera: no hay lectura nueva.
  leido: Promise<Resultado<Vehiculo | null>> | null
  // Lo escrito a mano de un proyecto externo.
  etiqueta: string | null
  cliente: ClienteDeLaCabecera
}

// La tarjeta «Vehículo y cliente» del panel del ítem en la hoja: el vehículo del proyecto (o «Proyecto externo»), el cliente que ya resolvió la página y, tocándola, sus fichas. Va en el `<Suspense>`
// de la página: si el vehículo tarda, el panel no espera.
export async function VehiculoYClienteDelItem({ leido, etiqueta, cliente }: Props) {
  const vehiculo = await textoDelVehiculo(leido, etiqueta)
  return (
    <TarjetaDeVehiculoYClienteDiferida vehiculo={vehiculo} cliente={textoDelCliente(cliente)} />
  )
}

async function textoDelVehiculo(
  leido: Props['leido'],
  etiqueta: string | null,
): Promise<{ texto: string; href: string | null }> {
  if (leido === null) {
    return {
      texto: etiqueta ? `Proyecto externo · ${etiqueta}` : 'Proyecto externo · sin vehículo',
      href: null,
    }
  }
  const resultado = await leido
  if (!resultado.ok) return { texto: ERROR_DEL_VEHICULO, href: null }
  if (resultado.data === null) return { texto: 'Vehículo que no puedes ver', href: null }
  return { texto: resultado.data.titulo, href: `${RUTAS.vehiculos}/${resultado.data.id}` }
}

// Lo que se ve mientras llega el vehículo: el alto de una tarjeta de la derecha, para que nada salte.
export function EsqueletoDeLaTarjetaDelItem() {
  return <Skeleton className="h-24 w-full" />
}
