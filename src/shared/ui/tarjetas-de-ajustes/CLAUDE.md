# shared/ui/tarjetas-de-ajustes

El patrón de las páginas de ajustes de Configuración (docs/GLOSARIO.md › Tarjeta de ajustes; docs/DECISIONES.md › Interfaz): tarjetas resumen con lo guardado a la
vista y un modal para editar. Sólo dibuja: no lee la base ni guarda nada.

## Entra y sale

- Sale (`index.ts`):
  - `<TarjetasDeAjustes etiqueta>`: el tablero. Columnas CSS de ancho mínimo (`columns-[20rem]`, en `rem`: con el texto al 200 % queda una); sin tope de ancho, en 1920 px entran más; sin `'use client'`.
  - `<TarjetaDeAjustes titulo estado? acciones? toque?>`: una región con nombre (el `h2`); la cabecera lleva el título y su `<Badge>` a la izquierda y el «⋯» a la derecha, **nunca un botón de acción suelto**. Las
    acciones llegan como **nodos** (`<MasAcciones>`, `<ToqueDeLaTarjeta>`): la tarjeta es sólo texto y viaja en frío. Con `toque`, el cuerpo deja pasar el clic al botón que cubre la tarjeta y sólo
    recupera el suyo un enlace, un interruptor o un botón de adentro.
  - `<ValoresDeLaTarjeta filas>`: el `dl` con «etiqueta, valor»; `valor: null` dice «Sin dato».
  - `<MuestraDeColor color>`: un color como cuadrito y su hex en texto.
  - `<TarjetaEditable titulo motivo abrir estado? extra?>`: `'use client'`; la tarjeta de lo que se edita en un modal: sólo su «⋯» —«Editar…» primera y principal (apagada, dice el `motivo`), `extra` después— y tocar la
    tarjeta abre el modal. Es un `<TarjetaTocable>` con el botón «Editar <título>». La usan Empresa, Sitio web, Legales, Leads y el perfil.
  - `<ListaCorta filas tope vacio>`: las primeras `tope` activas de un catálogo (icono, nombre, insignias de texto) y «y N más · M desactivados»; sin `'use client'`. La usa Leads.
  - `<TarjetaTocable titulo accion etiquetaDelMenu? abrir motivo estado? extra?>`: `'use client'`; la tarjeta que se abre **sin botón suelto**: sólo su «⋯» (`etiquetaDelMenu`, o `<accion>…`, como primera línea, apagada con el
    `motivo`) y tocar la tarjeta la abre. Con el teclado la tarjeta es un botón con nombre (`<accion>`) y el «⋯» va aparte (`Más acciones de <título>`). Con `motivo` la tarjeta no abre nada.
    Lo dibuja con `<ToqueDeLaTarjeta etiqueta abrir datosDelBoton?>` (`'use client'`): un botón que cubre la tarjeta (`absolute inset-0`) mientras las acciones van `relative` por encima, así ningún
    interactivo queda dentro de otro; la fila de una lista que se abre al tocarla lo usa igual (`FilaDeColor`). La usan «Para todos los orígenes», Colores, Vigencia, Monedas (base, activas, «Al compartir»), Comprobantes y las dos integraciones (éstas con `<TarjetaDeAjustes toque>` y su «⋯» propio).
  - `densidad="compacta"` (en `<TarjetaDeAjustes>` y `<TarjetaTocable>`): menos relleno y un alto mínimo fijo, para tarjetas que van en columnas con otras (el panel del ítem de repuestos). La tarjeta no cambia de alto al
    llegar su contenido.
  - `<ResumenDeLaTarjeta titulo estado alReintentar>`: `'use client'`; lo que dice una tarjeta que lee por su cuenta, en un alto fijo: `estado` `'leyendo'` (dos renglones de esqueleto), `'fallo'` («No pudimos mostrar
    «título».» con «Reintentar») o `'leido'` (sus `children`). Sin saltos de interfaz: los tres miden lo mismo.
  - `<LimiteDeTarjeta titulo>`: `'use client'`; el límite de error de una tarjeta que lee por su cuenta: si la lectura falla, esa tarjeta dice «No pudimos cargar «título»» con «Reintentar» (`router.refresh`) y las demás
    cosas de la página siguen.
- Aparte, en `src/shared/ui/`: `use-envio-con-version.ts` (`useEnvioConVersion()`, el guardado de un modal con versión) y
  `esqueletos/esqueleto-tarjetas.tsx` (`<EsqueletoTarjetas tarjetas>`, la misma grilla para `loading.tsx`).
- Lo usan las páginas de Empresa, Integraciones, Orígenes («Para todos los orígenes»), Comprobantes y Sitio web (Ajustes y Legales); Monedas (con la tarjeta de cada tipo de cambio) y el perfil (tarjetas de tres módulos en un mismo tablero; `<EsqueletoDeUnaTarjeta>` para el `<Suspense>` de cada una). No lo importan `layout.tsx` ni `_shell`.

## No se rompe

- Una tarjeta no se parte entre columnas (`break-inside-avoid`) y se separa con `mb-4`, no con `gap`. El orden del DOM es el de lectura y el de Tab: lo importante va primero.
- Un modal por tarjeta, con `ModalDeFormulario`; el `?panel=` lleva el nombre de la tarjeta y se revisa con `useRevisionAlAbrir()` si puede no abrirse. Nada de `<Bloque>` adentro.
- La versión de la fila entra al modal por props al abrir y **nunca** va en su `key` (guardar lo remontaría y perdería lo tipeado): la `key` es por apertura (`useApertura()`).
- Sin permiso, el «⋯» lleva la acción apagada con su motivo (y la tarjeta no abre nada); una tarjeta sin ninguna acción no dibuja «⋯» ni clic. El motivo también va en un `<Aviso>` de la página, no escondido.
- Lo que no es un botón de acción queda en la tarjeta: los interruptores que guardan al instante y los enlaces del texto. Si la primera acción es destructiva, tocar la tarjeta no hace nada: sólo el «⋯».
- Con el texto al 200 %: el `dl` pasa a una columna en una tarjeta angosta, el «⋯» no se sale y un interruptor queda a ≥ 16 px del borde de su tarjeta.
