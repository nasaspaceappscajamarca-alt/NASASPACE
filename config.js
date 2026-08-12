/* =====================================================================
   CONFIGURACIÓN — NASA Space Apps Challenge Cajamarca 2026
   Este es el único archivo que necesitas editar para poner la app en marcha.
   ===================================================================== */

window.CONFIG = {

  /* ---------------------------------------------------------------
     1. DATOS DEL EVENTO
     --------------------------------------------------------------- */
  evento: {
    nombre: 'NASA Space Apps Challenge',
    sede: 'Cajamarca',
    pais: 'Perú',
    anio: 2026,
    // Fecha y hora de inicio (ISO 8601 con zona horaria de Perú, -05:00)
    despegue: '2026-11-14T08:30:00-05:00',
    fechasTexto: '14 y 15 de noviembre de 2026',
    lugar: 'MAT Space Center, Cajamarca',
    comandante: 'Marco Portal',
    // Enlaces
    registroOficial: 'https://www.spaceappschallenge.org/',
    sedeLocal: 'https://www.spaceappschallenge.org/2025/local-events/cajamarca/',
    comunidad: '',            // pega aquí tu link de WhatsApp / Discord (opcional)
    instagram: '',            // ej. 'https://instagram.com/tu_cuenta'
    correoContacto: 'spaceappscajamarca@gmail.com'
  },

  /* ---------------------------------------------------------------
     2. BACKEND — de dónde salen el ID y el correo de bienvenida
     modo: 'apps-script'  → Google Sheets + Gmail  (recomendado, gratis)
           'emailjs'      → EmailJS (sin hoja de cálculo)
           'demo'         → sin backend: genera el pase pero NO envía correo
     --------------------------------------------------------------- */
  backend: {
    modo: 'demo',

    // --- Opción A: Google Apps Script (ver backend/Codigo.gs y el README) ---
    appsScript: {
      url: '' // ej. 'https://script.google.com/macros/s/AKfy.../exec'
    },

    // --- Opción B: EmailJS (https://emailjs.com) ---
    emailjs: {
      publicKey: '',
      serviceId: '',
      templateId: ''
    }
  },

  /* ---------------------------------------------------------------
     3. PASE DE ABORDAJE
     --------------------------------------------------------------- */
  pase: {
    // Prefijo del código. Con Apps Script el número es correlativo real
    // (NSA001, NSA002, ...). En modo demo/emailjs se deriva del correo.
    prefijo: 'NSA',

    // Ruta de tu diseño de fondo (unos 2000 x 800 px).
    // Debe tener VACÍOS: la caja blanca del nombre, el código y el QR.
    // Se incluyen dos versiones: .jpg (400 KB, la que carga por defecto)
    // y .png (1,4 MB, más nítida). Si el archivo no existe, la app dibuja
    // un pase propio automáticamente.
    plantilla: 'assets/pase-base.jpg',

    // Contenido del QR. {id} y {nombre} se reemplazan.
    qrTexto: 'https://www.spaceappschallenge.org/ | Pase {id} — {nombre}',

    /* Posiciones sobre la plantilla, en fracción de 0 a 1 (0 = borde izquierdo
       o superior, 1 = borde derecho o inferior).
       Para ajustarlas: abre la app, presiona la tecla "C" y pasa el mouse
       sobre el pase — verás las coordenadas exactas para copiar aquí. */
    campos: {
      nombre:       { x: 0.4875, y: 0.3346, tam: 0.058, color: '#101F4A', alinear: 'center', mayusculas: true, maxAncho: 0.259 },
      codigoTalon:  { x: 0.0235, y: 0.0643, tam: 0.034, color: '#FFFFFF', alinear: 'left' },
      codigoPase:   { x: 0.9490, y: 0.0643, tam: 0.034, color: '#FFFFFF', alinear: 'right' },
      especialista: { x: 0.4447, y: 0.9463, tam: 0.024, color: '#101F4A', alinear: 'left', mayusculas: true, maxAncho: 0.27 },
      qr:           { x: 0.1511, y: 0.7091, ancho: 0.1031 }
    },

    /* Tapa los datos de ejemplo que ya vienen quemados en la plantilla
       (el código NSA001, el QR y el nombre del especialista).
       Pon taparPlantilla en false cuando exportes tu Canva con esos
       campos en blanco: el resultado queda más limpio. */
    taparPlantilla: true,
    taparZonas: [
      { x0: 0.0200, y0: 0.0437, x1: 0.0825, y1: 0.0849 },  // código del talón
      { x0: 0.8919, y0: 0.0437, x1: 0.9540, y1: 0.0849 },  // código del pase
      { x0: 0.4425, y0: 0.9300, x1: 0.5680, y1: 0.9640 },  // especialista
      { x0: 0.0930, y0: 0.5750, x1: 0.2090, y1: 0.8430 }   // QR
    ]
  }
};
