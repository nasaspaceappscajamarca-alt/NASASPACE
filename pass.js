/* =====================================================================
   pass.js — dibuja el pase de abordaje en un <canvas>
   Dos modos:
     · Plantilla  → usa assets/pase-base.png y escribe encima
     · Generado   → si no hay plantilla, dibuja un pase propio
   ===================================================================== */

const Pase = (() => {
  const ALTO_BASE = 800;
  const ANCHO_BASE = 2000;

  let plantilla = null;
  let plantillaIntentada = false;

  /* ---------- utilidades ---------- */

  function cargarImagen(src) {
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = src;
    });
  }

  function rectRedondo(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fuente(peso, px, familia) {
    return `${peso} ${Math.round(px)}px ${familia || "Archivo, 'Fira Sans', 'Segoe UI', sans-serif"}`;
  }

  // Encoge el texto hasta que quepa en anchoMax
  function ajustar(ctx, texto, px, anchoMax, peso, familia) {
    let t = px;
    ctx.font = fuente(peso, t, familia);
    while (ctx.measureText(texto).width > anchoMax && t > 8) {
      t -= 1;
      ctx.font = fuente(peso, t, familia);
    }
    return t;
  }

  /* Color del marco que rodea una zona. Usa la mediana y no el promedio:
     sobre un fondo de estrellas, el promedio sale aclarado por los puntos
     brillantes, mientras que la mediana devuelve el azul del cielo. */
  function colorDelBorde(ctx, x, y, w, h) {
    try {
      const m = 12;
      const bandas = [
        [x - m, y - m, w + 2 * m, m],   // arriba
        [x - m, y + h, w + 2 * m, m],   // abajo
        [x - m, y, m, h],               // izquierda
        [x + w, y, m, h]                // derecha
      ];
      const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
      let n = 0;
      for (const [bx, by, bw, bh] of bandas) {
        const px = ctx.getImageData(
          Math.max(0, Math.round(bx)), Math.max(0, Math.round(by)),
          Math.max(1, Math.round(bw)), Math.max(1, Math.round(bh))
        ).data;
        for (let i = 0; i < px.length; i += 4) {
          hist[0][px[i]]++; hist[1][px[i + 1]]++; hist[2][px[i + 2]]++; n++;
        }
      }
      const mediana = (h8) => {
        let acc = 0;
        for (let v = 0; v < 256; v++) { acc += h8[v]; if (acc >= n / 2) return v; }
        return 0;
      };
      return `rgb(${mediana(hist[0])},${mediana(hist[1])},${mediana(hist[2])})`;
    } catch (e) {
      return '#0b1b3d';
    }
  }

  function taparZona(ctx, W, H, z) {
    const x = z.x0 * W, y = z.y0 * H, w = (z.x1 - z.x0) * W, h = (z.y1 - z.y0) * H;
    const color = z.color || colorDelBorde(ctx, x, y, w, h);
    ctx.save();
    try { ctx.filter = `blur(${Math.max(2, h * 0.12)}px)`; } catch (e) {}
    ctx.fillStyle = color;
    rectRedondo(ctx, x, y, w, h, Math.min(w, h) * 0.3);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- QR ---------- */

  function dibujarQR(ctx, texto, cx, cy, tam) {
    const fondo = '#FFFFFF', tinta = '#101F4A';
    if (typeof qrcode !== 'function') {
      ctx.fillStyle = fondo;
      ctx.fillRect(cx - tam / 2, cy - tam / 2, tam, tam);
      return;
    }
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 2;
    const celda = tam / (n + quiet * 2);
    const x0 = cx - tam / 2, y0 = cy - tam / 2;

    ctx.fillStyle = fondo;
    ctx.fillRect(x0, y0, tam, tam);
    ctx.fillStyle = tinta;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(
            Math.floor(x0 + (c + quiet) * celda),
            Math.floor(y0 + (r + quiet) * celda),
            Math.ceil(celda), Math.ceil(celda)
          );
        }
      }
    }
  }

  /* ---------- pase generado (sin plantilla) ---------- */

  function estrellas(ctx, x, y, w, h, cantidad, semilla) {
    let s = semilla || 7;
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < cantidad; i++) {
      const px = x + rnd() * w, py = y + rnd() * h, r = rnd() * 1.9 + 0.3;
      ctx.globalAlpha = 0.25 + rnd() * 0.65;
      ctx.fillStyle = rnd() > 0.85 ? '#BFE4FF' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.284); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function dibujarGenerado(ctx, W, H, d) {
    const ev = CONFIG.evento;
    const VOID = '#050B1F', HULL = '#101F4A', ION = '#2E9BF0', ICE = '#BFE4FF', FLARE = '#FC3D21';

    ctx.fillStyle = '#3D42C4';
    rectRedondo(ctx, 0, 0, W, H, 26); ctx.fill();

    const talonW = W * 0.30, sep = W * 0.312;

    // ---- talón ----
    ctx.save();
    rectRedondo(ctx, 14, 14, talonW - 28, H - 28, 16); ctx.clip();
    const g1 = ctx.createLinearGradient(0, 0, 0, H);
    g1.addColorStop(0, '#0A2A55'); g1.addColorStop(0.55, '#0B1B3D'); g1.addColorStop(1, '#04101F');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, talonW, H);
    estrellas(ctx, 0, 0, talonW, H * 0.55, 130, 11);

    ctx.font = fuente(800, H * 0.036); ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(d.id, 46, H * 0.082);

    ctx.textAlign = 'center';
    ctx.font = fuente(800, H * 0.075);
    ctx.fillText('SPACE APPS', talonW / 2, H * 0.30);
    ctx.font = fuente(700, H * 0.030); ctx.fillStyle = FLARE;
    ctx.fillText('NASA', talonW / 2, H * 0.225);
    ctx.fillStyle = ICE; ctx.font = fuente(600, H * 0.032);
    ctx.fillText(ev.sede.toUpperCase(), talonW / 2, H * 0.365);

    ctx.fillStyle = HULL; ctx.fillRect(14, H * 0.53, talonW - 28, H * 0.055);
    ctx.fillStyle = '#fff'; ctx.font = fuente(700, H * 0.033);
    ctx.fillText('RECUERDA', talonW / 2, H * 0.572);

    ctx.fillStyle = '#fff'; ctx.fillRect(14, H * 0.585, talonW - 28, H * 0.275);
    ctx.fillStyle = HULL; ctx.fillRect(14, H * 0.86, talonW - 28, H * 0.09);
    ctx.fillStyle = '#fff'; ctx.font = fuente(800, H * 0.048);
    ctx.fillText('ABORDANDO', talonW / 2, H * 0.918);
    ctx.restore();

    // perforación
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.setLineDash([12, 14]);
    ctx.beginPath(); ctx.moveTo(sep, 20); ctx.lineTo(sep, H - 20); ctx.stroke();
    ctx.setLineDash([]);

    // ---- cuerpo ----
    const bx = W * 0.322, bw = W - bx - 14;
    ctx.save();
    rectRedondo(ctx, bx, 14, bw, H - 28, 16); ctx.clip();
    const g2 = ctx.createLinearGradient(bx, 0, W, H);
    g2.addColorStop(0, '#061635'); g2.addColorStop(1, '#020A1A');
    ctx.fillStyle = g2; ctx.fillRect(bx, 0, bw, H);
    estrellas(ctx, bx, 0, bw, H, 220, 29);

    // luna
    const lcx = bx + bw * 0.52, lcy = H * 0.46, lr = H * 0.42;
    const gl = ctx.createRadialGradient(lcx, lcy, lr * 0.2, lcx, lcy, lr);
    gl.addColorStop(0, 'rgba(120,190,255,.55)');
    gl.addColorStop(0.6, 'rgba(46,155,240,.20)');
    gl.addColorStop(1, 'rgba(46,155,240,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(lcx, lcy, lr, 0, 6.284); ctx.fill();

    ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.font = fuente(700, H * 0.036);
    ctx.fillText('NATIONAL AERONAUTICS AND SPACE ADMINISTRATION', bx + 40, H * 0.10);
    ctx.font = fuente(800, H * 0.055);
    ctx.fillText(`PASE DE ABORDAJE · NSA ${ev.anio}`, bx + 40, H * 0.205);

    ctx.fillStyle = '#fff';
    rectRedondo(ctx, bx + 40, H * 0.287, bw * 0.46, H * 0.095, H * 0.048); ctx.fill();

    // panel de datos
    ctx.fillStyle = 'rgba(180,215,255,.13)';
    rectRedondo(ctx, bx + 150, H * 0.575, bw * 0.44, H * 0.245, 20); ctx.fill();
    const filas = [
      ['COHETE', 'CREATIVIDAD', 'SITIO DE LANZAMIENTO', ev.lugar],
      ['NAVE', 'CONOCIMIENTO', 'DESTINO', 'AL INFINITO Y MÁS ALLÁ']
    ];
    filas.forEach((f, i) => {
      const y = H * (0.635 + i * 0.115);
      ctx.fillStyle = '#fff'; ctx.font = fuente(700, H * 0.032);
      ctx.fillText(f[0], bx + 175, y);
      ctx.fillStyle = ICE; ctx.font = fuente(400, H * 0.030);
      ctx.fillText(f[1], bx + 175, y + H * 0.045);
      ctx.fillStyle = '#fff'; ctx.font = fuente(700, H * 0.032);
      ctx.fillText(f[2], bx + 150 + bw * 0.22, y);
      ctx.fillStyle = ICE; ctx.font = fuente(400, H * 0.030);
      ctx.fillText(f[3], bx + 150 + bw * 0.22, y + H * 0.045);
    });

    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = fuente(800, H * 0.075);
    ctx.fillText('SPACE APPS', W - 60, H * 0.44);
    ctx.font = fuente(700, H * 0.034); ctx.fillStyle = FLARE;
    ctx.fillText('NASA', W - 60, H * 0.355);
    ctx.fillStyle = '#fff'; ctx.font = fuente(700, H * 0.048);
    ctx.fillText(ev.sede.toUpperCase(), W - 60, H * 0.53);
    ctx.restore();

    // barra inferior
    ctx.fillStyle = '#F2F6FF';
    rectRedondo(ctx, bx, H * 0.885, bw, H * 0.10, 14); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = HULL; ctx.font = fuente(700, H * 0.030);
    ctx.fillText('COMANDANTE: ' + ev.comandante.toUpperCase(), bx + 30, H * 0.935);
    ctx.fillText('ESPECIALISTA DE MISIÓN:', bx + 30, H * 0.972);
    ctx.textAlign = 'right';
    ctx.fillText('MILLAS ACUMULADAS:  lím f(x) = ∞', W - 30, H * 0.955);
  }

  /* ---------- campos dinámicos ---------- */

  function escribir(ctx, W, H, c, texto) {
    if (!c || !texto) return;
    const t = c.mayusculas ? String(texto).toUpperCase() : String(texto);
    const px = c.tam * H;
    const peso = c.peso || 800;
    const anchoMax = c.maxAncho ? c.maxAncho * W : Infinity;
    const real = ajustar(ctx, t, px, anchoMax, peso);
    ctx.fillStyle = c.color || '#fff';
    ctx.textAlign = c.alinear || 'left';
    ctx.textBaseline = 'middle';
    ctx.font = fuente(peso, real);
    ctx.fillText(t, c.x * W, c.y * H);
    ctx.textBaseline = 'alphabetic';
  }

  function dibujarCampos(ctx, W, H, d) {
    const c = CONFIG.pase.campos;
    escribir(ctx, W, H, c.nombre, d.nombre);
    escribir(ctx, W, H, c.codigoTalon, d.id);
    escribir(ctx, W, H, c.codigoPase, d.id);
    escribir(ctx, W, H, c.especialista, d.nombre);
    if (c.qr) {
      const texto = (CONFIG.pase.qrTexto || '{id}')
        .replace('{id}', d.id).replace('{nombre}', d.nombre);
      dibujarQR(ctx, texto, c.qr.x * W, c.qr.y * H, c.qr.ancho * W);
    }
  }

  /* ---------- API ---------- */

  async function render(canvas, d) {
    if (!plantillaIntentada) {
      plantillaIntentada = true;
      if (CONFIG.pase.plantilla) plantilla = await cargarImagen(CONFIG.pase.plantilla);
    }
    const W = plantilla ? plantilla.naturalWidth : ANCHO_BASE;
    const H = plantilla ? plantilla.naturalHeight : ALTO_BASE;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (plantilla) {
      ctx.drawImage(plantilla, 0, 0, W, H);
      if (CONFIG.pase.taparPlantilla) {
        (CONFIG.pase.taparZonas || []).forEach((z) => taparZona(ctx, W, H, z));
      }
    } else {
      dibujarGenerado(ctx, W, H, d);
    }
    dibujarCampos(ctx, W, H, d);
    return canvas;
  }

  return { render, usaPlantilla: () => !!plantilla };
})();
