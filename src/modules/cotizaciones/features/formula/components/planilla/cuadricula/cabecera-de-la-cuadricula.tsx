// La fila de títulos de la cuadrícula: #, A · concepto, B · %, C · valor y Ejemplo, sin letra: no se nombra en una fórmula (# y A pegadas a la izquierda, como
// sus celdas).
const TITULO =
  'border-b border-(--color-line-strong) bg-(--color-surface) px-2 py-2 text-left text-(length:--text-xs) font-semibold text-(--color-ink-soft)'

export function CabeceraDeLaCuadricula() {
  return (
    <thead>
      <tr aria-rowindex={1}>
        <th scope="col" className={`${TITULO} sticky left-0 z-10 w-10 text-right`}>
          <span aria-hidden>#</span>
          <span className="sr-only">Número</span>
        </th>
        <th scope="col" className={`${TITULO} sticky left-10 z-10 border-r`}>
          A · concepto
        </th>
        <th scope="col" className={`${TITULO} text-right`}>
          B · %
        </th>
        <th scope="col" className={`${TITULO} text-right`}>
          C · valor
        </th>
        <th scope="col" className={`${TITULO} pr-12 text-right`}>
          Ejemplo
        </th>
      </tr>
    </thead>
  )
}
