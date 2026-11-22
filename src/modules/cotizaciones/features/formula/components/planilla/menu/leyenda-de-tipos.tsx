import { ETIQUETA_DEL_TIPO, TIPOS_DE_CELDA } from '../../../../../entities/formula/tipo-de-celda'
import { FONDO_DEL_TIPO } from '../cuadricula/clases'

// Los ocho tipos de celda con el fondo que les da la columna C (D10), uno por renglón: lo abre «?» junto a la barra de fórmula (`TiposDeCelda`).
export function LeyendaDeTipos() {
  return (
    <ul
      aria-label="Tipos de celda"
      className="grid min-w-0 gap-1.5 text-(length:--text-sm) text-(--color-ink)"
    >
      {TIPOS_DE_CELDA.map((tipo) => (
        <li key={tipo} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-3 shrink-0 rounded-sm border border-(--color-line-strong) ${FONDO_DEL_TIPO[tipo]}`}
          />
          {ETIQUETA_DEL_TIPO[tipo]}
        </li>
      ))}
    </ul>
  )
}
