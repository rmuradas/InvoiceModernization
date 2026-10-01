<!--
SYNC IMPACT REPORT
==================
Versión: 1.0.0 → 2.0.0 (MAJOR: fin de fase, redefinición incompatible de principios)
Motivo del salto: la constitución cierra la fase "documentar y proteger" y abre la fase de
  MODERNIZACIÓN por estrangulamiento. Se redefinen de forma incompatible los principios que
  prohibían toda corrección (antiguo III) y toda dependencia/refactor (antiguo IV): ahora ambas
  cosas se permiten bajo condiciones estrictas. Es una ruptura de gobernanza, no una ampliación.

Principios (antes 5, ahora 7):
  I.   El comportamiento actual es sagrado — POR DEFECTO
         (antes: "sagrado" sin excepción → ahora: cambiable solo con decisión de negocio
         registrada en el registro de anomalías, citando quién y cuándo)
  II.  Evidencia obligatoria (se mantiene, sin cambio material)
  III. Los characterization tests son el árbitro (NUEVO — eleva a principio la disciplina de
         tests; fija la regla del prefijo "CONGELA comportamiento actual:" y la exigencia de citar
         la decisión autorizante en el propio commit)
  IV.  Estrangulamiento antes que reescritura (NUEVO — un módulo a la vez, con spec, extracción y
         verificación de equivalencia)
  V.   Dependencias nuevas con justificación (reemplaza al antiguo "Cero dependencias nuevas y
         cero refactors": las dependencias dejan de estar prohibidas pero requieren justificación
         en la spec y aprobación explícita; preferencia por la biblioteca estándar de Node)
  VI.  Ningún cambio retroactivo jamás (NUEVO — las facturas ya emitidas y sus importes son
         intocables, pase lo que pase con la lógica)
  VII. Español de España (se mantiene, sin cambio material)

Principios eliminados / fusionados:
  - Antiguo III "Los hallazgos no se corrigen, se registran" → se fusiona dentro del nuevo
    Principio I (el registro de anomalías sigue siendo el cauce, pero ahora SÍ autoriza corregir).
  - Antiguo IV "Cero dependencias nuevas y cero refactors" → sustituido por el nuevo Principio V
    (dependencias) y el nuevo Principio IV (estrangulamiento, que autoriza extraer/reescribir
    módulos uno a uno, lo que antes estaba prohibido como "refactor").

Secciones añadidas:
  - "Alcance de esta fase: modernización por estrangulamiento" (reemplaza a "Alcance de esta
    fase: documentar y proteger")
  - "Disciplina de arbitraje por tests" (reemplaza a "Disciplina de caracterización y registro")

Secciones eliminadas:
  - "Alcance de esta fase: documentar y proteger" (contenido sustituido por el de arriba)
  - "Disciplina de caracterización y registro" (contenido sustituido por el de arriba)

Plantillas y artefactos dependientes revisados:
  ✅ .specify/templates/plan-template.md   — genérico, el gate de constitución ya se completa a
       partir del fichero vigente; sin referencias obsoletas que corregir.
  ✅ .specify/templates/spec-template.md   — genérico, sin referencias a principios concretos.
  ✅ .specify/templates/tasks-template.md  — genérico, sin referencias a principios concretos.
  ✅ .specify/templates/checklist-template.md — genérico, sin referencias a principios concretos.
  ✅ CLAUDE.md (raíz del repo)             — actualizado en este mismo cambio: sustituida la
       sección "fase actual: documentar y proteger" y "cero dependencias/cero refactors" por la
       fase de modernización y las reglas nuevas.
  ✅ specs/000-reconocimiento/registro-de-anomalias.md — ya usa el vocabulario de "corregir en
       modernización" y "no retroactivo" en sus 22 anomalías; coherente con esta enmienda, sin
       cambios de contenido requeridos por la constitución.

TODO diferidos: ninguno.
-->

# GesFact Constitution

Constitución del sistema **GesFact** — programa de facturación en producción de
**Suministros Hidalgo S.L.** GesFact factura dinero real y terceros (la gestoría) dependen de
sus resultados exactos, céntimo a céntimo. Es un sistema **heredado**. La fase de reconocimiento
(documentar y proteger) ha concluido: el objetivo de esta fase es **modernizarlo sin romperlo**,
módulo a módulo, por estrangulamiento.

## Core Principles

### I. El comportamiento actual es sagrado — por defecto

El comportamiento observable actual del sistema sigue siendo la referencia por defecto. Ningún
cambio de comportamiento observable se realiza **sin una decisión de negocio registrada por
escrito**, citando **quién la tomó y cuándo**.

- Se considera comportamiento observable: importes calculados, redondeos, numeración de
  facturas, contenido de informes, ficheros de remesa, textos mostrados, y cualquier salida
  que un usuario o la gestoría pueda ver o recibir.
- La decisión que autoriza un cambio se registra en
  `specs/000-reconocimiento/registro-de-anomalias.md` (o el documento que lo sustituya como
  registro vigente de anomalías), con el nombre del responsable y la fecha de la decisión.
- Sin esa decisión registrada, un comportamiento que parezca incorrecto **no se toca**: se
  documenta como anomalía (Principio II) y espera su turno.
- Una decisión registrada habilita el cambio **hacia delante**; nunca reescribe lo ya emitido
  (Principio VI).

**Fundamento**: el sistema mueve dinero real y la gestoría reconcilia céntimo a céntimo. Abrir la
puerta a corregir comportamiento exige, a cambio, una traza explícita de quién decidió qué y
cuándo, para que ningún cambio sea silencioso.

### II. Evidencia obligatoria

Toda afirmación sobre lo que el sistema hace, o sobre la decisión que autoriza cambiarlo, DEBE ir
acompañada de su evidencia. Sin evidencia, la afirmación no se documenta como hecho.

Formas de evidencia admitidas:

- **Código**: fichero y líneas concretas (p. ej. `services/calculo.js:42-58`).
- **Dato real**: un valor observado en la base de datos de producción (`datos/gesfact.db`) o en
  una salida real del sistema.
- **Testimonio o decisión del negocio**: declaración o aprobación de una persona identificada,
  con **nombre y fecha**.

Reglas:

- Todo lo que no tenga evidencia se marca explícitamente como **SUPOSICIÓN** y se convierte en
  una **pregunta** dirigida al negocio. Una SUPOSICIÓN nunca se presenta como hecho.
- Las citas de código usan ruta y rango de líneas; los testimonios y decisiones citan quién y
  cuándo.

**Fundamento**: en un sistema heredado sin documentación fiable, la memoria y la intuición
engañan. Solo la evidencia trazable permite modernizar con confianza, tanto para proteger
comportamiento como para autorizar cambiarlo.

### III. Los characterization tests son el árbitro

Los tests de caracterización (`node:test`) son la fuente de verdad operativa sobre lo que el
sistema hace hoy. Un test en rojo durante la modernización significa, por defecto, que la
modernización ha roto algo: **se revierte el código, no se ajusta el test**.

- Todo test con el prefijo **"CONGELA comportamiento actual:"** protege un comportamiento
  blindado. Modificar ese test, o regenerar el golden master que lo respalda, exige **citar en el
  propio commit** la decisión de negocio (Principio I) que lo autoriza.
- Un test prefijado así que falla sin que exista esa decisión **no se "arregla" ni se relaja**:
  el cambio de código que lo rompió se revierte.
- Añadir nuevos characterization tests al extraer un módulo (Principio IV) es parte obligatoria
  de la extracción, no un extra.

**Fundamento**: sin este árbitro, cada desarrollador decide informalmente si un comportamiento
roto importa. Fijar la regla en el propio test, y exigir la cita de la decisión en el commit que
lo toca, hace la autorización verificable con `git log` en vez de depender de memoria o confianza.

### IV. Estrangulamiento antes que reescritura

GesFact se moderniza por el patrón de **estrangulamiento** (strangler fig): módulo a módulo,
nunca de una vez. Queda **prohibido reescribir más de un módulo a la vez**.

- Cada módulo a modernizar tiene su propia spec, su propia extracción de código, y su propia
  verificación de equivalencia frente al comportamiento actual (Principio III) antes de darse
  por completada.
- "Módulo" se corresponde con la partición por dominio ya acordada en
  `specs/000-reconocimiento/propuesta-particion-specs.md` (o la partición vigente que la
  sustituya), no con una unidad arbitraria.
- Mientras un módulo está en curso de extracción, el resto del sistema permanece bajo el
  Principio I sin tocar.

**Fundamento**: reescribir todo a la vez multiplica el riesgo en un sistema que factura dinero
real sin red de seguridad previa. Un módulo a la vez permite verificar equivalencia con un
alcance acotado y revertir sin arrastrar al resto del sistema.

### V. Dependencias nuevas con justificación

Las dependencias nuevas dejan de estar prohibidas, pero no son gratuitas.

- Toda dependencia nueva requiere **justificación escrita en la spec** del módulo que la
  introduce y **aprobación explícita** antes de instalarse.
- Se prefiere la **biblioteca estándar de Node** cuando exista una solución equivalente, antes de
  añadir un paquete externo.
- Esto se aplica también a reemplazar una dependencia existente (p. ej. sustituir `sqlite3` o
  añadir un framework de test), no solo a añadir una nueva.

**Fundamento**: la fase de reconocimiento mantuvo la superficie de cambio en cero prohibiendo
dependencias; en modernización hace falta poder evolucionar la pila, pero sin volver a la
situación previa de dependencias añadidas sin registro ni criterio.

### VI. Ningún cambio retroactivo jamás

Las facturas ya emitidas y sus importes son **intocables**, pase lo que pase con la lógica que
las generó.

- Ninguna corrección, migración de datos, regeneración de golden master o cambio de módulo
  reescribe el importe, la numeración o el contenido de una factura ya emitida.
- Un error detectado en una factura ya emitida se documenta como hecho consumado (anomalía con
  evidencia, Principio II); su remedio, si lo hay, es el cauce legal/fiscal correspondiente
  (p. ej. una rectificativa), nunca editar el registro histórico.
- Esta regla no tiene excepción por decisión de negocio: ni siquiera una decisión registrada
  (Principio I) autoriza reescribir una factura ya emitida.

**Fundamento**: la numeración correlativa sin huecos es obligación legal (inspección de 2020) y
la gestoría reconcilia lo ya emitido. Tocar el histórico, aunque sea para "arreglarlo", rompe la
trazabilidad fiscal que el propio sistema existe para garantizar.

### VII. Español de España

Todo el material producido —constitución, especificaciones, registro de anomalías, nombres de
tests, comentarios, mensajes de commit y comunicación— se redacta en **español de España**, en
coherencia con el resto del proyecto y con sus usuarios.

**Fundamento**: el negocio, la gestoría y el equipo operan en español. La coherencia lingüística
reduce ambigüedad y errores de interpretación en un dominio donde la precisión es crítica.

## Alcance de esta fase: modernización por estrangulamiento

Esta constitución rige la fase de **modernización** de GesFact, que sucede a la fase de
reconocimiento (documentar y proteger, ya cerrada). En consecuencia:

- **Dentro de alcance**: extraer módulos uno a uno según la partición por dominio acordada, con
  su spec, sus characterization tests y su verificación de equivalencia; corregir anomalías ya
  registradas cuando exista decisión de negocio escrita; introducir dependencias justificadas y
  aprobadas.
- **Fuera de alcance**: reescribir más de un módulo a la vez (Principio IV); cambiar
  comportamiento observable sin decisión registrada (Principio I); tocar facturas ya emitidas
  (Principio VI).
- El `registro-de-anomalias.md` producido en la fase de reconocimiento es el **punto de partida**
  de esta fase: cada anomalía ya clasificada (INTENCIONAL, ACCIDENTAL, BUG A SECAS, BUG
  HISTÓRICO CON DEPENDIENTES) espera ahí su decisión de tratamiento definitivo antes de tocarse.

## Disciplina de arbitraje por tests

- **Characterization tests**: siguen describiendo lo que el sistema hace hoy. Los que llevan el
  prefijo **"CONGELA comportamiento actual:"** son el blindaje de un comportamiento sagrado
  (Principio I) y solo se tocan citando la decisión autorizante en el commit (Principio III).
- **Golden master**: regenerarlo es un cambio de la misma categoría que modificar un test
  prefijado; exige la misma cita de decisión en el commit.
- **Ejecución de tests**: mediante el runner nativo de Node (`node:test`); ningún test modifica el
  estado de producción ni depende de servicios externos vivos.
- **Extracción de módulo**: no se considera completa sin sus characterization tests en verde
  frente al comportamiento previamente congelado, salvo las diferencias explícitamente
  autorizadas por una decisión registrada.
- **Trazabilidad**: cada decisión que autoriza un cambio de comportamiento enlaza con su entrada
  en el registro de anomalías y con su evidencia (Principio II).

## Governance

- Esta constitución **prevalece** sobre cualquier otra práctica durante esta fase. Ante un
  conflicto entre conveniencia y estos principios, prevalecen los principios.
- **Enmiendas**: cualquier modificación de esta constitución requiere (a) justificación escrita,
  (b) aprobación explícita del negocio, y (c) actualización de la versión y la fecha de última
  enmienda según la política de versionado.
- **Política de versionado** (versionado semántico):
  - **MAJOR**: eliminación o redefinición incompatible de principios o de la gobernanza.
  - **MINOR**: adición de un principio o sección, o ampliación material de la guía.
  - **PATCH**: aclaraciones, correcciones de redacción y ajustes no semánticos.
- **Cumplimiento**: toda especificación, plan, conjunto de tareas y cambio producido bajo esta
  fase debe verificar su conformidad con estos principios. Un cambio que altere comportamiento
  observable sin decisión de negocio registrada, que reescriba una factura ya emitida, o que
  reescriba más de un módulo a la vez, es por definición no conforme y se rechaza.
- **Excepción a comportamiento sagrado**: solo el negocio, por escrito, con identificación de la
  persona y la fecha, y registrado en el registro de anomalías, puede autorizar un cambio de
  comportamiento observable — con la excepción absoluta del Principio VI (nunca retroactivo).

**Version**: 2.0.0 | **Ratified**: 2026-07-07 | **Last Amended**: 2026-10-01
