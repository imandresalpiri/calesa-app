// Por qué un bloque no vale todavía, a la vista del bloque (lo dice la misma regla que la base).
export function MotivoDelBloque({ motivo }: { motivo: string | null }) {
  return motivo === null ? null : (
    <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
      {motivo}
    </p>
  )
}
