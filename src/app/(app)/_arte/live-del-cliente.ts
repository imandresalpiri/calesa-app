// Cómo deja el Modo Live de quien pide ver a los clientes, para el editor de artes (el lead de ejemplo): `apagado`, `nombres` o `completo`; sin
// el Live, `completo`. Sin sesión, como sin el Live (la página ya la pidió).
import 'server-only'
import { getLive } from '@/modules/equipo'
import { clientesEnElLive, type ClientesEnElLive } from './lead-de-ejemplo'

export async function liveDelCliente(): Promise<ClientesEnElLive> {
  return clientesEnElLive(await getLive())
}
