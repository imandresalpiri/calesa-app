# shared/ui/tarjetas-de-ajustes

El patrón de las páginas de ajustes de Configuración (docs/GLOSARIO.md › Tarjeta de ajustes; docs/DECISIONES.md › Interfaz): tarjetas resumen con lo guardado a la
vista y un modal para editar. Sólo dibuja: no lee la base ni guarda nada.

## Entra y sale

- Sale (`index.ts`):
  - `<TarjetasDeAjustes etiqueta>`: el tablero. Columnas CSS por contenedor (`@container/ajustes`: 1, 2 desde `@2xl`, 3 desde `@5xl`); sin `'use client'`.
  - `<TarjetaDeAjustes titulo estado? accion? acciones?>`: una región con nombre (el `h2`); la cabecera lleva el título y su `<Badge>` a la izquierda y la
    acción principal y el «⋯» a la derecha. Las acciones llegan como **nodos** (`<BotonDeLaTarjeta>`, `<MasAcciones>`): la tarjeta es sólo texto y viaja en frío.
  - `<ValoresDeLaTarjeta filas>`: el `dl` con «etiqueta, valor»; `valor: null` dice «Sin dato».
  - `<MuestraDeColor color>`: un color como cuadrito y su hex en texto.
  - `<TarjetaEditable titulo panel motivo abrir estado? extra?>`: `'use client'`; la tarjeta de lo que se edita en un modal: «Editar» a la vista y como primera
    línea del «⋯» (apagada, dice el `motivo`), con `extra` después. La usan Empresa, Sitio web, Legales y Leads.
  - `<ListaCorta filas tope vacio>`: las primeras `tope` activas de un catálogo (icono, nombre, insignias de texto) y «y N más · M desactivados»; sin `'use client'`. La usa Leads.
  - `<BotonDeLaTarjeta panel etiqueta deshabilitado?>`: `'use client'`; abre `?panel=<panel>` con `usePanelPorUrl()`.
  - `<TarjetaTocable titulo accion abrir motivo estado? extra?>`: `'use client'`; la tarjeta que se abre **sin botón suelto**: sólo su «⋯» (`<accion>…` como primera línea, apagada con el
    `motivo`) y tocar la tarjeta la abre. Con el teclado la tarjeta es un botón con nombre (`<accion>`) y el «⋯» va aparte (`Más acciones de <título>`). Con `motivo` la tarjeta no abre nada.
    Lo dibuja con `<ToqueDeLaTarjeta etiqueta abrir datosDelBoton?>` (`'use client'`): un botón que cubre la tarjeta (`absolute inset-0`) mientras las acciones van `relative` por encima, así ningún
    interactivo queda dentro de otro; la fila de una lista que se abre al tocarla lo usa igual (`FilaDeColor`). La usa «Para todos los orígenes».
  - `<LimiteDeTarjeta titulo>`: `'use client'`; el límite de error de una tarjeta que lee por su cuenta: si la lectura falla, esa tarjeta dice «No pudimos cargar «título»» con «Reintentar» (`router.refresh`) y las demás
    cosas de la página siguen.
- Aparte, en `src/shared/ui/`: `use-envio-con-version.ts` (`useEnvioConVersion()`, el guardado de un modal con versión) y
  `esqueletos/esqueleto-tarjetas.tsx` (`<EsqueletoTarjetas tarjetas>`, la misma grilla para `loading.tsx`).
- Lo usan las páginas de Empresa, Integraciones, Orígenes («Para todos los orígenes»), Comprobantes y Sitio web (Ajustes y Legales); Monedas (con la tarjeta de cada tipo de cambio) y el perfil (tarjetas de tres módulos en un mismo tablero; `<EsqueletoDeUnaTarjeta>` para el `<Suspense>` de cada una). No lo importan `layout.tsx` ni `_shell`.

## No se rompe

- Una tarjeta no se parte entre columnas (`break-inside-avoid`) y se separa con `mb-4`, no con `gap`. El orden del DOM es el de lectura y el de Tab: lo importante va primero.
- Un modal por tarjeta, con `ModalDeFormulario`; el `?panel=` lleva el nombre de la tarjeta y se revisa con `useRevisionAlAbrir()` si puede no abrirse. Nada de `<Bloque>` adentro.
- La versión de la fila entra al modal por props al abrir y **nunca** va en su `key` (guardar lo remontaría y perdería lo tipeado): la `key` es por apertura (`useApertura()`).
- Sin permiso, la acción principal se ve apagada y el motivo va en un `<Aviso>` de la página, no escondido.
- Con el texto al 200 %: el `dl` pasa a una columna en una tarjeta angosta, los botones parten el texto y un interruptor queda a ≥ 16 px del borde de su tarjeta.
