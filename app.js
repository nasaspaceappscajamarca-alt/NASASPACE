/* =====================================================================
   app.js — registro, emisión del pase y correo de bienvenida
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const EV = CONFIG.evento;

/* =====================================================================
   1. Cielo de fondo
   ===================================================================== */
(function cielo() {
  const c = $('cielo');
  if (!c) return;
  const ctx = c.getContext('2d');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let estrellas = [], w = 0, h = 0;

  function medir() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 9000);
    estrellas = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.25 + 0.25,
      a: Math.random() * 0.6 + 0.15,
      v: Math.random() * 0.012 + 0.003,
      f: Math.random() * 6.28
    }));
  }

  function pintar(t) {
    ctx.clearRect(0, 0, w, h);
    for (const e of estrellas) {
      const brillo = quieto ? e.a : e.a * (0.55 + 0.45 * Math.sin(t * e.v + e.f));
      ctx.globalAlpha = brillo;
      ctx.fillStyle = e.r > 1.1 ? '#BFE4FF' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.284); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!quieto) requestAnimationFrame(pintar);
  }

  medir();
  addEventListener('resize', () => { medir(); if (quieto) pintar(0); });
  quieto ? pintar(0) : requestAnimationFrame(pintar);
})();

/* =====================================================================
   2. Datos del evento en la página
   ===================================================================== */
(function pintarDatos() {
  $('tFechas').textContent = EV.fechasTexto;
  $('tSede').textContent = `${EV.sede}, ${EV.pais}`;
  $('pieAnio').textContent = EV.anio;
  $('btnOficial').href = EV.registroOficial;
  if (EV.correoContacto) {
    $('pieContacto').innerHTML = `<a href="mailto:${EV.correoContacto}">${EV.correoContacto}</a>`;
  }
})();

/* =====================================================================
   3. Cuenta regresiva
   ===================================================================== */
(function cuenta() {
  const objetivo = new Date(EV.despegue).getTime();
  const dd = $('cDias'), hh = $('cHoras'), mm = $('cMin'), ss = $('cSeg');
  const pie = $('cuentaPie'), estado = $('estadoPuerta');

  function tic() {
    let d = objetivo - Date.now();
    if (d <= 0) {
      dd.textContent = '000'; hh.textContent = '00'; mm.textContent = '00'; ss.textContent = '00';
      pie.textContent = 'Despegue en curso — nos vemos en la sede';
      estado.innerHTML = '<i></i> En vuelo';
      return;
    }
    const s = Math.floor(d / 1000);
    dd.textContent = String(Math.floor(s / 86400)).padStart(3, '0');
    hh.textContent = String(Math.floor(s / 3600) % 24).padStart(2, '0');
    mm.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
    ss.textContent = String(s % 60).padStart(2, '0');
  }
  tic();
  setInterval(tic, 1000);
})();

/* =====================================================================
   4. Utilidades
   ===================================================================== */
function limpiarNombre(v) {
  return v.trim().replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{M}'’\- ]/gu, '')
    .split(' ')
    .map((p) => p.charAt(0).toLocaleUpperCase('es') + p.slice(1).toLocaleLowerCase('es'))
    .join(' ');
}

function correoValido(v) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
}

// Código estable derivado del correo (se usa si no hay backend correlativo)
function codigoLocal(correo) {
  let h = 2166136261;
  for (const ch of correo.toLowerCase().trim()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '', n = Math.abs(h);
  for (let i = 0; i < 3; i++) { s += abc[n % abc.length]; n = Math.floor(n / abc.length); }
  return CONFIG.pase.prefijo + s;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* =====================================================================
   5. Backends
   ===================================================================== */
const Backend = {
  async registrar(datos) {
    const modo = CONFIG.backend.modo;
    if (modo === 'apps-script') return this.appsScript(datos);
    if (modo === 'emailjs') return this.emailjs(datos);
    return { ok: true, id: codigoLocal(datos.correo), correoEnviado: false, demo: true };
  },

  async appsScript(datos) {
    const url = CONFIG.backend.appsScript.url;
    if (!url) throw new Error('Falta la URL del Apps Script en config.js');
    // Sin cabeceras propias: así el navegador no dispara preflight CORS.
    const r = await fetch(url, { method: 'POST', body: JSON.stringify(datos) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'El servidor rechazó el registro');
    return { ok: true, id: j.id, correoEnviado: false, duplicado: !!j.duplicado };
  },

  // Segundo paso: el pase ya está dibujado, así que va adjunto al correo.
  async bienvenida(persona, imagen) {
    if (CONFIG.backend.modo !== 'apps-script') return false;
    const url = CONFIG.backend.appsScript.url;
    const r = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        accion: 'bienvenida',
        id: persona.id, nombre: persona.nombre, correo: persona.correo,
        pase: imagen
      })
    });
    const j = await r.json();
    return !!j.correoEnviado;
  },

  async emailjs(datos) {
    const c = CONFIG.backend.emailjs;
    if (!c.publicKey || !c.serviceId || !c.templateId) {
      throw new Error('Faltan las claves de EmailJS en config.js');
    }
    const id = codigoLocal(datos.correo);
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: c.serviceId,
        template_id: c.templateId,
        user_id: c.publicKey,
        template_params: {
          to_name: datos.nombre,
          to_email: datos.correo,
          pase_id: id,
          evento: `${EV.nombre} ${EV.sede} ${EV.anio}`,
          fechas: EV.fechasTexto,
          lugar: EV.lugar,
          registro_oficial: EV.registroOficial
        }
      })
    });
    if (!r.ok) throw new Error('EmailJS respondió ' + r.status);
    return { ok: true, id, correoEnviado: true };
  }
};

/* =====================================================================
   6. Secuencia de emisión
   ===================================================================== */
async function correrSecuencia(hasta) {
  const lista = $('secuencia');
  lista.hidden = false;
  const pasos = [...lista.querySelectorAll('li')];
  for (let i = 0; i <= hasta; i++) {
    pasos.forEach((p, j) => {
      p.classList.toggle('activo', j === i);
      p.classList.toggle('listo', j < i);
    });
    await esperar(430);
  }
  pasos.forEach((p) => { p.classList.remove('activo'); p.classList.add('listo'); });
  await esperar(280);
  lista.hidden = true;
  pasos.forEach((p) => p.classList.remove('listo'));
}

/* =====================================================================
   7. Formulario
   ===================================================================== */
let ultimoPase = null;

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const err = $('error');
  const iNombre = $('nombre'), iCorreo = $('correo');
  const nombre = limpiarNombre(iNombre.value);
  const correo = iCorreo.value.trim().toLowerCase();

  const fallar = (campo, msg) => {
    err.textContent = msg; err.hidden = false;
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  };
  err.hidden = true;
  iNombre.removeAttribute('aria-invalid');
  iCorreo.removeAttribute('aria-invalid');

  if (nombre.length < 3) return fallar(iNombre, 'Escribe tu nombre y apellido para imprimirlos en el pase.');
  if (!correoValido(correo)) return fallar(iCorreo, 'Ese correo no parece válido. Revísalo y vuelve a intentar.');

  const btn = $('btnEnviar');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Emitiendo…';

  const secuencia = correrSecuencia(3);

  let res;
  try {
    res = await Backend.registrar({
      nombre, correo,
      acepta: $('acepto').checked,
      sede: EV.sede,
      anio: EV.anio,
      origen: location.href
    });
  } catch (ex) {
    await secuencia;
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Emitir mi pase';
    err.textContent = 'No pudimos completar el registro: ' + ex.message + ' Intenta de nuevo en un momento.';
    err.hidden = false;
    return;
  }

  await secuencia;
  await mostrarPase({ id: res.id, nombre, correo }, res);
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Emitir mi pase';
});

/* =====================================================================
   8. Mostrar el pase
   ===================================================================== */
async function mostrarPase(persona, res) {
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

  const canvas = $('pase');
  await Pase.render(canvas, persona);
  ultimoPase = persona;

  $('form').hidden = true;
  $('resultado').hidden = false;

  const conf = $('confirmacion');
  const base = `Listo, <b>${persona.nombre.split(' ')[0]}</b>. Tu asiento es el <b>${persona.id}</b>.`;
  const decir = (extra) => { conf.innerHTML = base + ' ' + extra; };

  if (navigator.canShare) $('btnCompartir').hidden = false;
  $('resultado').scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (res.demo) {
    return decir('La app está en modo demo: el pase se generó, pero todavía no se envían correos. Configura el backend en config.js.');
  }
  if (res.duplicado) {
    return decir('Ya estabas en la lista de tripulación, así que reimprimimos tu pase. El correo de bienvenida se envió la primera vez.');
  }
  if (res.correoEnviado) {
    return decir(`Te mandamos la bienvenida a <b>${persona.correo}</b> — si no la ves, revisa spam o promociones.`);
  }

  // apps-script: mandamos el correo con el pase adjunto
  decir('Enviando tu correo de bienvenida…');
  try {
    const imagen = canvas.toDataURL('image/jpeg', 0.92);
    const enviado = await Backend.bienvenida(persona, imagen);
    decir(enviado
      ? `Te mandamos la bienvenida a <b>${persona.correo}</b>, con el pase adjunto — si no la ves, revisa spam o promociones.`
      : `Tu asiento quedó guardado, pero el correo no salió. Escríbenos a ${EV.correoContacto} y lo resolvemos.`);
  } catch (e) {
    decir(`Tu asiento quedó guardado. El correo de bienvenida no salió esta vez; descarga tu pase con el botón de abajo.`);
  }
}

/* =====================================================================
   9. Descargar y compartir
   ===================================================================== */
function nombreArchivo(p) {
  return `pase-${p.id}-${p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
}

$('btnDescargar').addEventListener('click', () => {
  if (!ultimoPase) return;
  const a = document.createElement('a');
  a.download = nombreArchivo(ultimoPase);
  a.href = $('pase').toDataURL('image/png');
  a.click();
});

$('btnCompartir').addEventListener('click', () => {
  if (!ultimoPase) return;
  $('pase').toBlob(async (blob) => {
    const archivo = new File([blob], nombreArchivo(ultimoPase), { type: 'image/png' });
    const carga = {
      files: [archivo],
      title: `Pase ${ultimoPase.id}`,
      text: `Ya tengo mi pase para el ${EV.nombre} ${EV.sede} ${EV.anio}. El despegue es el ${EV.fechasTexto}. 🚀`
    };
    try {
      if (navigator.canShare && navigator.canShare(carga)) await navigator.share(carga);
      else await navigator.share({ title: carga.title, text: carga.text, url: location.href });
    } catch (e) { /* el usuario canceló */ }
  }, 'image/png');
});

$('btnOtro').addEventListener('click', () => {
  $('resultado').hidden = true;
  $('form').hidden = false;
  $('form').reset();
  $('acepto').checked = true;
  $('nombre').focus();
});

/* =====================================================================
   10. Calibración del pase — tecla "C"
   ===================================================================== */
(function calibrar() {
  const caja = $('regla');
  const lienzo = $('pase');
  let activo = false;

  addEventListener('keydown', (e) => {
    if (e.key !== 'c' && e.key !== 'C') return;
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    activo = !activo;
    caja.hidden = !activo;
    caja.textContent = activo
      ? 'Calibración activa · pasa el mouse sobre el pase'
      : '';
  });

  lienzo.addEventListener('mousemove', (e) => {
    if (!activo) return;
    const r = lienzo.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    caja.textContent =
      `x: ${x.toFixed(4)}   y: ${y.toFixed(4)}\n` +
      `→ pega estos valores en config.js › pase.campos`;
  });
})();
