import { leerCategoriasDeFaq, leerFaqs } from '@/modules/web'
import { PreguntasFrecuentes } from '@/modules/web/pantallas/sitio-faqs'
import { datosO } from '@/shared/lib/errores'

// «Preguntas frecuentes» (8.02-1). Si no se pueden leer, el `error.tsx` con «Reintentar» (nunca una lista vacía que se confunda con «no hay»). La
// lista se renueva con el `revalidatePath` de cada action. Las categorías de FAQ, en paralelo: el combo de cada pregunta.
export async function SeccionFaqs() {
  const [faqs, categorias] = await Promise.all([leerFaqs(), leerCategoriasDeFaq()])
  const { faqs: lista, hayMas } = datosO(faqs)
  return <PreguntasFrecuentes faqs={lista} hayMas={hayMas} categorias={datosO(categorias)} />
}
