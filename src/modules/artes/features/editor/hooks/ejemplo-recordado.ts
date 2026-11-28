// La elección del vehículo de ejemplo en el `localStorage` de este navegador (`entities/datos/ejemplo-elegido.ts`): leerla al abrir el editor
// y escribirla al elegir. `recordarElEjemplo` sale por `client.ts`: deja elegido el ejemplo antes de abrir el editor (la «Crear una nueva» de
// compartir una cotización). Siempre en try/catch: sin almacenamiento (modo privado, lleno) la elección vale mientras la pantalla esté abierta.
import {
  claveDelEjemplo,
  esquemaDelEjemplo,
  leerElEjemplo,
  type EjemploElegido,
} from '../../../entities/datos/ejemplo-elegido'

// Escribe (o borra, con `null`) la elección en el `localStorage`. Sin almacenamiento (modo privado, lleno) no pasa nada: se vuelve a elegir.
export function recordarElEjemplo(
  personaId: string,
  plantillaId: string,
  eleccion: EjemploElegido | null,
): void {
  try {
    const clave = claveDelEjemplo(personaId, plantillaId)
    if (eleccion === null) {
      window.localStorage.removeItem(clave)
    } else {
      window.localStorage.setItem(clave, JSON.stringify(esquemaDelEjemplo.parse(eleccion)))
    }
  } catch {
    // Sin almacenamiento: la elección vale sólo mientras la pantalla esté abierta.
  }
}

// Lee la elección recordada; sin almacenamiento o con algo roto, ninguna.
export function elEjemploRecordado(personaId: string, plantillaId: string): EjemploElegido | null {
  try {
    return leerElEjemplo(window.localStorage.getItem(claveDelEjemplo(personaId, plantillaId)))
  } catch {
    return null
  }
}
