# Pase de abordaje — NASA Space Apps Challenge Cajamarca 2026

Una página donde cada persona escribe su nombre y su correo, y en el mismo momento:

1. se le asigna un código correlativo (`NSA001`, `NSA002`, …),
2. se dibuja su pase de abordaje personalizado y lo puede descargar o compartir,
3. le llega un correo de bienvenida con el pase adjunto y el contexto del evento,
4. su registro queda guardado en una hoja de cálculo tuya.

Todo es HTML, CSS y JavaScript sin compilación ni dependencias externas: funciona
publicándolo tal cual en **GitHub Pages**.

---

## 1. Publicarlo en 2 minutos

1. Crea un repositorio nuevo en GitHub y sube estos archivos a la raíz.
2. Entra en **Settings → Pages**.
3. En *Source* elige `Deploy from a branch`, rama `main`, carpeta `/ (root)`. Guarda.
4. En un minuto tendrás la app en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Recién subida funciona en **modo demo**: emite pases de verdad, pero todavía no
manda correos. Los pasos 3 y 4 activan el envío.

### Probarlo en tu computadora antes de subirlo

Ábrelo **con un servidor local**, no haciendo doble clic en `index.html`. Si lo
abres como archivo suelto, el navegador bloquea la lectura de la imagen de fondo
y el botón de descarga falla. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Y entra a `http://localhost:8000`.

---

## 2. Poner tus datos

Todo lo editable está en **`config.js`**. Abre el archivo y cambia el bloque `evento`:
fechas, lugar, nombre del comandante, correo de contacto y —si tienes— el enlace
del grupo de WhatsApp o Discord de la sede.

---

## 3. Poner tu diseño del pase

El repositorio ya trae `assets/pase-base.png`, que es el diseño de Canva de la sede.
La app lo usa como fondo y escribe encima el nombre, el código y el QR.

Para que quede perfecto, **exporta tu diseño de Canva sin los datos de ejemplo**:
borra el `NSA001` de las dos esquinas, el QR de muestra y el nombre que aparece
junto a *Mission Specialist*, deja esos espacios vacíos y exporta como PNG a
2000 × 800 px. Luego, en `config.js`, pon:

```js
taparPlantilla: false
```

Si prefieres no volver a exportar, déjalo en `true`: la app tapa esos datos
muestreando el color del fondo antes de escribir los nuevos.

### Mover un campo de sitio

Si cambias el diseño y algún texto queda descuadrado:

1. Abre la app y emite un pase de prueba.
2. Presiona la tecla **C**.
3. Pasa el mouse por encima del pase: abajo a la izquierda aparecen las
   coordenadas `x` e `y` de ese punto, en fracciones de 0 a 1.
4. Copia esos números al campo correspondiente en `config.js › pase.campos`.

El tamaño de letra (`tam`) también va en fracción: `0.058` significa 5,8 % de la
altura del pase, así que el diseño se mantiene si algún día cambias la resolución.

---

## 4. Activar el correo de bienvenida

Elige **una** de las dos opciones.

### Opción A — Google Sheets + Gmail (recomendada)

Es gratis, guarda todos los registros en una hoja de cálculo, asigna los códigos
correlativos de verdad y manda el pase adjunto en el correo.

1. Crea una hoja de cálculo nueva en Google Sheets. Copia su **ID**: es el tramo
   largo de la URL, entre `/d/` y `/edit`.
2. Ve a [script.google.com](https://script.google.com) → **Nuevo proyecto**.
3. Borra el contenido y pega todo `backend/Codigo.gs`.
4. Arriba del archivo, reemplaza `PEGA_AQUI_EL_ID_DE_TU_HOJA` por el ID del paso 1
   y revisa el bloque `EVENTO` (fechas, lugar, comandante, contacto, y `sitio`
   con la URL de tu GitHub Pages).
5. Ejecuta la función `probar` una vez. Google te pedirá autorizar los permisos
   de correo y hoja de cálculo: acéptalos. Te llegará un correo de prueba a ti
   mismo y verás la primera fila en la hoja.
6. Pulsa **Implementar → Nueva implementación → Aplicación web** con:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario**
7. Copia la URL que termina en `/exec` y pégala en `config.js`:

```js
backend: {
  modo: 'apps-script',
  appsScript: { url: 'https://script.google.com/macros/s/AKfy.../exec' }
}
```

> **Cuota de envío:** una cuenta de Gmail normal manda hasta ~100 correos al día;
> una cuenta de Google Workspace (institucional), hasta 1500. Si esperas más
> inscripciones que eso en un solo día, reparte el registro en varias jornadas o
> usa una cuenta institucional.

> Cada vez que edites el código en Apps Script tienes que volver a
> **Implementar → Administrar implementaciones → Editar → Nueva versión**, o los
> cambios no salen en vivo.

### Opción B — EmailJS

Más rápido de montar, pero no guarda los registros ni adjunta el pase, y el plan
gratuito trae 200 correos al mes.

1. Crea una cuenta en [emailjs.com](https://www.emailjs.com/) y conecta tu Gmail.
2. Crea una plantilla nueva y pega en ella el HTML de `email/bienvenida.html`.
3. Copia tu *Public Key*, *Service ID* y *Template ID* en `config.js`:

```js
backend: {
  modo: 'emailjs',
  emailjs: { publicKey: '...', serviceId: '...', templateId: '...' }
}
```

---

## 5. Estructura

```
index.html             la página
styles.css             estilos
config.js              ← lo único que necesitas editar
app.js                 formulario, cuenta regresiva, envío
pass.js                dibuja el pase en un <canvas>
vendor/qrcode.js       generador de QR (MIT, Kazuhiko Arase)
assets/pase-base.jpg   tu diseño de fondo (versión ligera)
assets/pase-base.png   el mismo diseño en máxima calidad
backend/Codigo.gs      backend de Google Apps Script
email/bienvenida.html  plantilla del correo para EmailJS
```

---

## 6. Antes de abrirlo al público

- **Marca NASA.** El nombre y los logos del Space Apps Challenge son de la NASA.
  Como sede oficial, usa los archivos del *brand kit* que reparte el equipo global
  a los Local Leads, y no modifiques el logotipo.
- **Registro oficial.** Esta app es el registro de la sede; la inscripción global
  se hace en [spaceappschallenge.org](https://www.spaceappschallenge.org/).
  Tanto la página como el correo lo dicen explícitamente: no lo quites.
- **Datos personales.** Los nombres y correos quedan en tu hoja de cálculo.
  Mantenla privada, úsala solo para el evento y respeta las bajas que te pidan.
- **Prueba el correo** enviándotelo a ti primero y revisa cómo se ve en el móvil
  y si cae en spam.

---

## 7. Licencia

El código de esta app es libre: úsalo, modifícalo y adáptalo para tu sede.
No cubre los logotipos ni la identidad visual de la NASA o del Space Apps
Challenge, que se rigen por sus propias condiciones de uso.
