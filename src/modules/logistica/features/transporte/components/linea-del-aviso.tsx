// La línea sobre los campos del hueco «Transporte» que dice que el cambio no es sólo de esta unidad (`avisoDelTransporte`). Su alto (un renglón) está reservado
// siempre, también vacía y en el esqueleto: el formulario no salta cuando el aviso llega o se va. Compatible con servidor.
export function LineaDelAviso({ texto }: { texto: string | null }) {
  return (
    <p
      data-aviso-del-transporte=""
      className="min-h-[1lh] text-(length:--text-sm) text-(--color-ink-soft)"
    >
      {texto}
    </p>
  )
}
