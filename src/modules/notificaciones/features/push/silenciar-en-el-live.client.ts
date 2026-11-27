// El push de este dispositivo con el Modo Live (`entities/silencio-del-push.ts`): lo pide por `import()` `<SilencioDelPushEnElLive>` sólo al cambiar el
// estado, así no suma al marco. Las pestañas del dispositivo se turnan con un candado del navegador (`navigator.locks`) y cada turno vuelve a leer la
// marca: dos pestañas que ven el mismo cambio no dan de baja dos veces ni pisan la clave guardada.
import {
  desuscribirEnElNavegador,
  darDeBajaEnElNavegador,
  soportaPush,
  suscribirEnElNavegador,
} from '../../composicion.client'
import { CLAVE_DEL_SILENCIO_DEL_PUSH, pasoDelSilencio } from '../../entities/silencio-del-push'
import { quitarSuscripcion } from './actions/quitar-suscripcion'
import { suscribirPush } from './actions/suscribir-push'

function leerLaMarca(): string | null {
  try {
    return localStorage.getItem(CLAVE_DEL_SILENCIO_DEL_PUSH)
  } catch {
    return null
  }
}

function escribirLaMarca(valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(CLAVE_DEL_SILENCIO_DEL_PUSH)
    else localStorage.setItem(CLAVE_DEL_SILENCIO_DEL_PUSH, valor)
  } catch {
    // Sin almacenamiento no queda la marca: al apagar el Live, el push se enciende otra vez desde Perfil.
  }
}

// Da de baja la suscripción y quita su fila (lo que no se quite lo borra el envío con el 410). La marca va antes de la baja: si la pestaña se cierra
// a mitad, al apagar el Live se intenta reanudar igual.
async function silenciar(): Promise<void> {
  escribirLaMarca('')
  const baja = await darDeBajaEnElNavegador()
  if (baja === null) return
  escribirLaMarca(baja.clavePublica ?? '')
  await quitarSuscripcion({ endpoint: baja.endpoint }).catch(() => undefined)
}

// Vuelve a suscribir con la clave guardada sólo si el permiso sigue dado (nunca lo pide) y guarda la fila; si la base no la toma, la baja otra vez.
async function reanudar(clave: string): Promise<void> {
  escribirLaMarca(null)
  if (clave === '' || Notification.permission !== 'granted') return
  const hecho = await suscribirEnElNavegador(clave)
  if (!hecho.ok) return
  const guardada = await suscribirPush(hecho.suscripcion).catch(() => undefined)
  if (guardada?.data?.ok !== true) await desuscribirEnElNavegador()
}

async function unTurno(enElLive: boolean): Promise<void> {
  const marca = leerLaMarca()
  const paso = pasoDelSilencio(enElLive, marca)
  if (paso === 'silenciar') await silenciar()
  if (paso === 'reanudar') await reanudar(marca ?? '')
}

export async function sincronizarElPushConElLive(enElLive: boolean): Promise<void> {
  if (!soportaPush()) return
  try {
    if ('locks' in navigator) {
      await navigator.locks.request(CLAVE_DEL_SILENCIO_DEL_PUSH, () => unTurno(enElLive))
    } else {
      await unTurno(enElLive)
    }
  } catch {
    // El push es un extra del Live: un fallo acá no frena la pantalla.
  }
}
