<!--
SYNC IMPACT REPORT
==================
Versión: (plantilla sin ratificar) → 1.0.0
Motivo del salto: primera ratificación de la constitución del proyecto (MAJOR inicial).

Principios definidos (5):
  I.   El comportamiento actual es sagrado
  II.  Evidencia obligatoria
  III. Los hallazgos no se corrigen, se registran
  IV.  Cero dependencias nuevas y cero refactors
  V.   Español de España

Secciones añadidas:
  - Alcance de esta fase (Documentar y proteger)
  - Disciplina de caracterización y registro
  - Gobernanza

Secciones eliminadas: ninguna (se sustituyen los marcadores de la plantilla).

Plantillas y artefactos dependientes:
  ⚠ .specify/templates/plan-template.md   — revisar "Constitution Check" (pendiente)
  ⚠ .specify/templates/spec-template.md   — alinear con evidencia/anomalías (pendiente)
  ⚠ .specify/templates/tasks-template.md  — reflejar tests de caracterización con node:test (pendiente)

TODO diferidos: ninguno.
-->

# GesFact Constitution

Constitución del sistema **GesFact** — programa de facturación en producción de
**Suministros Hidalgo S.L.** GesFact factura dinero real y terceros (la gestoría) dependen de
sus resultados exactos, céntimo a céntimo. Es un sistema **heredado**. El objetivo de esta
fase es **documentarlo y protegerlo, no mejorarlo**.

## Core Principles

### I. El comportamiento actual es sagrado

El comportamiento observable actual del sistema es la especificación. NINGÚN cambio de
comportamiento observable se realiza sin una decisión explícita y por escrito del negocio,
**aunque el comportamiento parezca un error**.

- Se considera comportamiento observable: importes calculados, redondeos, numeración de
  facturas, contenido de informes, ficheros de remesa, textos mostrados, y cualquier salida
  que un usuario o la gestoría pueda ver o recibir.
- Si un comportamiento parece incorrecto, NO se corrige: se registra como anomalía
  (ver Principio III) y la decisión de cambiarlo pertenece a una fase posterior.
- Los cambios permitidos en esta fase son únicamente los que **no alteran** ninguna salida
  observable: añadir tests de caracterización, añadir documentación y registrar hallazgos.

**Fundamento**: el sistema mueve dinero real y la gestoría reconcilia sus resultados céntimo a
céntimo. Un cambio silencioso, por bienintencionado que sea, puede provocar facturas erróneas,
descuadres fiscales y responsabilidad frente a terceros.

### II. Evidencia obligatoria

Toda afirmación sobre lo que el sistema hace DEBE ir acompañada de su evidencia. Sin evidencia,
la afirmación no se documenta como hecho.

Formas de evidencia admitidas:

- **Código**: fichero y líneas concretas (p. ej. `services/calculo.js:42-58`).
- **Dato real**: un valor observado en la base de datos de producción (`datos/gesfact.db`) o en
  una salida real del sistema.
- **Testimonio del negocio**: declaración de una persona identificada, con **nombre y fecha**.

Reglas:

- Todo lo que no tenga evidencia se marca explícitamente como **SUPOSICIÓN** y se convierte en
  una **pregunta** dirigida al negocio. Una SUPOSICIÓN nunca se presenta como hecho.
- Las citas de código usan ruta y rango de líneas; los testimonios citan quién y cuándo.

**Fundamento**: en un sistema heredado sin documentación fiable, la memoria y la intuición
engañan. Solo la evidencia trazable permite proteger el comportamiento con confianza.

### III. Los hallazgos no se corrigen, se registran

Bugs, riesgos, rarezas y comportamientos sorprendentes NO se corrigen en esta fase: se anotan
en el **registro de anomalías** con su clasificación.

- Cada hallazgo se registra con: descripción, evidencia (Principio II), y clasificación
  (p. ej. severidad y tipo).
- Corregir un hallazgo es una decisión del **módulo/fase siguiente**, no de esta. Aquí solo se
  documenta y se protege.
- Encontrar un bug no autoriza a tocarlo. La reacción correcta ante un bug es registrarlo.

**Fundamento**: separar "descubrir y documentar" de "decidir y corregir" evita cambios
precipitados y deja al negocio la potestad de priorizar el riesgo con información completa.

### IV. Cero dependencias nuevas y cero refactors

En esta fase NO se añade ninguna dependencia ni se reorganiza el código.

- **Cero paquetes nuevos**: no se instala ningún paquete adicional. Las dependencias del
  proyecto permanecen tal cual (`express`, `ejs`, `body-parser`, `sqlite3`).
- **Cero refactors**: no se renombra, mueve, reestructura ni "limpia" código de producción.
- **Tests de caracterización**: se escriben usando **exclusivamente el runner nativo de Node
  (`node:test`)**. No se introduce ningún framework de test externo.

**Fundamento**: cada dependencia y cada refactor es una oportunidad de alterar el comportamiento
sagrado (Principio I) e introducir riesgo. Caracterizar con las herramientas nativas mantiene la
superficie de cambio en cero.

### V. Español de España

Todo el material producido —constitución, especificaciones, registro de anomalías, nombres de
tests, comentarios, mensajes de commit y comunicación— se redacta en **español de España**, en
coherencia con el resto del proyecto y con sus usuarios.

**Fundamento**: el negocio, la gestoría y el equipo operan en español. La coherencia lingüística
reduce ambigüedad y errores de interpretación en un dominio donde la precisión es crítica.

## Alcance de esta fase: documentar y proteger

Esta constitución rige una fase cuyo único objetivo es **documentar y proteger** GesFact, no
mejorarlo. En consecuencia:

- **Dentro de alcance**: caracterizar el comportamiento actual mediante tests con `node:test`,
  documentarlo con evidencia, y mantener el registro de anomalías.
- **Fuera de alcance**: cualquier mejora, optimización, corrección de bugs, migración
  (incluida la migración a MySQL pendiente), o cambio funcional.
- Las tareas heredadas pendientes conocidas (envío de facturas por email roto, módulo de
  albaranes a medias, migración a MySQL) se tratan como **contexto histórico**, no como trabajo
  de esta fase; si son relevantes, se registran, no se abordan.

## Disciplina de caracterización y registro

- **Tests de caracterización**: describen lo que el sistema **hace hoy**, no lo que "debería"
  hacer. Si un test captura un comportamiento aparentemente erróneo, ese comportamiento se
  documenta como tal y se registra como anomalía (Principio III), pero el test refleja la
  realidad observada.
- **Registro de anomalías**: es el único destino de los hallazgos. Ninguna anomalía se
  "arregla sobre la marcha".
- **Ejecución de tests**: mediante el runner nativo de Node; ningún test debe modificar el
  estado de producción ni depender de servicios externos vivos.
- **Trazabilidad**: cada afirmación documentada enlaza con su evidencia (Principio II).

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
  observable sin aprobación escrita del negocio es, por definición, no conforme y se rechaza.
- **Excepción a comportamiento sagrado**: solo el negocio, por escrito y con identificación de
  la persona y la fecha, puede autorizar un cambio de comportamiento observable.

**Version**: 1.0.0 | **Ratified**: 2026-07-07 | **Last Amended**: 2026-07-07
