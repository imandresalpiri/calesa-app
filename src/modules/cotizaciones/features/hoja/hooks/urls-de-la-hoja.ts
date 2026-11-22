import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PRIVADA } from '../../privada/hooks/use-privada-de-la-nueva'

// Lo que la hoja abre vive en la URL (`.claude/rules/ui.md`): «Avanzado» en `?panel=avanzado`, «Vista previa» de la tarjeta en `?panel=vista-previa`, la ayuda de una celda en
// `?ayuda=bloques&nodo=<id>` (la clave `ayuda`, aparte de `panel`; `texto` y `tabla`, las de antes, se leen y se cambian por `bloques`) y el ajuste de una celda (el ⚙) en
// `?ajuste=celda&nodo=<id>` (la clave `ajuste`; comparte `nodo` con la ayuda porque las dos son paneles y con uno abierto no se alcanza el otro). El ⚙ de la cabecera, en `?ajuste=cabecera`.
export const PANEL_DE_AVANZADO = 'avanzado'
export const PANEL_DE_VISTA_PREVIA = 'vista-previa'
export const CLAVE_DE_AYUDA = 'ayuda'
export const AYUDA_EN_BLOQUES = 'bloques'
// Las de antes (un enlace guardado, el historial): abren la misma ayuda.
export const AYUDAS_DE_ANTES: ReadonlySet<string> = new Set(['texto', 'tabla'])
export const CLAVE_DE_AJUSTE = 'ajuste'
export const AJUSTE_DE_CELDA = 'celda'
export const AJUSTE_DE_CABECERA = 'cabecera'
export const CLAVE_DEL_NODO = 'nodo'

// Quita de la URL lo que la hoja tenía abierto: guardada, «Cotizar otra» vuelve a montar la hoja y no debe reabrir el modal, la ayuda ni el ajuste, ni nacer privada
// (`?privada=si`). Sólo toca lo suyo (otro `?panel=` queda).
export function useSoltarLoAbierto() {
  const [url, escribir] = useQueryStates({
    panel: parseAsString,
    [CLAVE_DE_AYUDA]: parseAsString,
    [CLAVE_DE_AJUSTE]: parseAsString,
    [CLAVE_DEL_NODO]: parseAsString,
    [CLAVE_DE_PRIVADA]: parseAsString,
  })
  return () => {
    void escribir(
      {
        ...(url.panel === PANEL_DE_AVANZADO || url.panel === PANEL_DE_VISTA_PREVIA
          ? { panel: null }
          : {}),
        ...(url[CLAVE_DE_AYUDA] === AYUDA_EN_BLOQUES ||
        AYUDAS_DE_ANTES.has(url[CLAVE_DE_AYUDA] ?? '')
          ? { [CLAVE_DE_AYUDA]: null, [CLAVE_DEL_NODO]: null }
          : {}),
        ...(url[CLAVE_DE_AJUSTE] === AJUSTE_DE_CELDA
          ? { [CLAVE_DE_AJUSTE]: null, [CLAVE_DEL_NODO]: null }
          : {}),
        ...(url[CLAVE_DE_AJUSTE] === AJUSTE_DE_CABECERA ? { [CLAVE_DE_AJUSTE]: null } : {}),
        ...(url[CLAVE_DE_PRIVADA] === null ? {} : { [CLAVE_DE_PRIVADA]: null }),
      },
      { history: 'replace' },
    )
  }
}
