import { partesDelTexto } from '../../../../entities/texto-de-la-ayuda'

// Un texto de la ayuda: los saltos de línea se respetan, lo largo se parte y lo que va entre `**` sale en negrita.
export function BloqueDeTexto({ texto }: { texto: string }) {
  return (
    <p className="text-(length:--text-base) break-words whitespace-pre-line text-(--color-ink)">
      {partesDelTexto(texto).map((parte, i) =>
        parte.negrita ? (
          <strong key={i} className="font-semibold">
            {parte.texto}
          </strong>
        ) : (
          <span key={i}>{parte.texto}</span>
        ),
      )}
    </p>
  )
}

// Un título dentro de la ayuda (el primero ya es el del panel): encabeza lo que le sigue.
export function BloqueDeTitulo({ texto }: { texto: string }) {
  return (
    <h3 className="text-(length:--text-base) font-semibold break-words text-(--color-ink)">
      {texto}
    </h3>
  )
}
