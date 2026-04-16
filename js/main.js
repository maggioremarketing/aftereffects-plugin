// main.js

var csInterface = new CSInterface();

// ── Estado central ──────────────────────────────────────────────
var cfg = {
    introDuration:     0.5,
    introDirection:    "Izquierda",
    introDistance:     60,
    introOpacity:      0,
    introBlur:         30,
    introEaseInfluence:2,

    outroEnabled:      true,
    outroDuration:     0.5,
    outroDirection:    "Derecha",
    outroDistance:     60,
    outroOpacity:      0,
    outroBlur:         10,
    outroEaseInfluence:2,

    basedOn:           "Words",
    easeLow:           100,
    easeHigh:          0,
    smoothness:        100
};

// ── Referencias DOM ─────────────────────────────────────────────
var fields = {
    introDuration:      document.getElementById("introDuration"),
    introDirection:     document.getElementById("introDirection"),
    introDistance:      document.getElementById("introDistance"),
    introOpacity:       document.getElementById("introOpacity"),
    introBlur:          document.getElementById("introBlur"),
    introEaseInfluence: document.getElementById("introEaseInfluence"),

    outroEnabled:       document.getElementById("outroEnabled"),
    outroDuration:      document.getElementById("outroDuration"),
    outroDirection:     document.getElementById("outroDirection"),
    outroDistance:      document.getElementById("outroDistance"),
    outroOpacity:       document.getElementById("outroOpacity"),
    outroBlur:          document.getElementById("outroBlur"),
    outroEaseInfluence: document.getElementById("outroEaseInfluence"),

    basedOn:            document.getElementById("basedOn"),
    easeLow:            document.getElementById("easeLow"),
    easeHigh:           document.getElementById("easeHigh"),
    smoothness:         document.getElementById("smoothness")
};

var outroBody   = document.getElementById("outroBody");
var statusEl    = document.getElementById("status");
var canvas      = document.getElementById("preview-canvas");
var ctx         = canvas.getContext("2d");

// ── Leer campos → cfg ───────────────────────────────────────────
function readFields() {
    cfg.introDuration      = parseFloat(fields.introDuration.value)      || 0.5;
    cfg.introDirection     = fields.introDirection.value;
    cfg.introDistance      = parseFloat(fields.introDistance.value)      || 60;
    cfg.introOpacity       = parseFloat(fields.introOpacity.value)       || 0;
    cfg.introBlur          = parseFloat(fields.introBlur.value)          || 0;
    cfg.introEaseInfluence = parseFloat(fields.introEaseInfluence.value) || 2;

    cfg.outroEnabled       = fields.outroEnabled.checked;
    cfg.outroDuration      = parseFloat(fields.outroDuration.value)      || 0.5;
    cfg.outroDirection     = fields.outroDirection.value;
    cfg.outroDistance      = parseFloat(fields.outroDistance.value)      || 60;
    cfg.outroOpacity       = parseFloat(fields.outroOpacity.value)       || 0;
    cfg.outroBlur          = parseFloat(fields.outroBlur.value)          || 0;
    cfg.outroEaseInfluence = parseFloat(fields.outroEaseInfluence.value) || 2;

    cfg.basedOn            = fields.basedOn.value;
    cfg.easeLow            = parseFloat(fields.easeLow.value)            || 100;
    cfg.easeHigh           = parseFloat(fields.easeHigh.value)           || 0;
    cfg.smoothness         = parseFloat(fields.smoothness.value)         || 100;
}

// ── Toggle salida ───────────────────────────────────────────────
fields.outroEnabled.addEventListener("change", function () {
    outroBody.classList.toggle("disabled", !this.checked);
    readFields();
    restartPreview();
});

// ── Escuchar cambios en todos los campos ────────────────────────
Object.keys(fields).forEach(function (key) {
    var el = fields[key];
    if (!el) return;
    var evt = (el.tagName === "SELECT" || el.type === "checkbox") ? "change" : "input";
    el.addEventListener(evt, function () {
        readFields();
        restartPreview();
    });
});

// ── Previsualización en canvas ──────────────────────────────────
var previewRaf   = null;
var previewStart = null;
var PREVIEW_W, PREVIEW_H;
var WORDS = ["Hola", "mundo", "texto"];

function resizeCanvas() {
    PREVIEW_W = canvas.offsetWidth;
    PREVIEW_H = canvas.offsetHeight;
    canvas.width  = PREVIEW_W * window.devicePixelRatio;
    canvas.height = PREVIEW_H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// Easing suave tipo ease-out (simula influence alta = desacelera al final)
function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
function easeInQuart(t)  { return Math.pow(t, 4); }

function dirOffset(dir, dist) {
    switch (dir) {
        case "Arriba":    return { x: 0,     y:  dist };
        case "Abajo":     return { x: 0,     y: -dist };
        case "Izquierda": return { x:  dist, y: 0 };
        case "Derecha":   return { x: -dist, y: 0 };
        default:          return { x: 0,     y:  dist };
    }
}

function drawFrame(timestamp) {
    if (!previewStart) previewStart = timestamp;
    var elapsed = (timestamp - previewStart) / 1000; // segundos

    // Duración total del ciclo: intro + hold + outro + pausa
    var hold      = 0.6;
    var outroDur  = cfg.outroEnabled ? cfg.outroDuration : 0;
    var cycleDur  = cfg.introDuration + hold + outroDur + 0.4;
    var t         = elapsed % cycleDur;

    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    // Fondo
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

    var fontSize  = 22;
    var wordGap   = 8;
    ctx.font      = "600 " + fontSize + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // Medir palabras
    var totalW = 0;
    var widths = WORDS.map(function(w) {
        var mw = ctx.measureText(w).width;
        totalW += mw;
        return mw;
    });
    totalW += wordGap * (WORDS.length - 1);
    var startX = (PREVIEW_W - totalW) / 2;
    var baseY  = PREVIEW_H / 2 + fontSize * 0.35;

    WORDS.forEach(function(word, i) {
        // Calcular progreso de este word con stagger
        var stagger   = cfg.introDuration * 0.35 * i / WORDS.length;

        // ── Intro progress ──
        var tIntro    = Math.max(0, t - stagger);
        var introProgress = Math.min(1, tIntro / cfg.introDuration);
        introProgress = easeOutQuart(introProgress);

        // ── Outro progress ──
        var outroProgress = 0;
        if (cfg.outroEnabled) {
            var outroStart = cfg.introDuration + hold;
            var tOutro     = Math.max(0, t - outroStart - stagger * 0.5);
            outroProgress  = Math.min(1, tOutro / Math.max(cfg.outroDuration, 0.01));
            outroProgress  = easeInQuart(outroProgress);
        }

        // ── Valores animados ──
        var introOff  = dirOffset(cfg.introDirection, cfg.introDistance);
        var outroOff  = dirOffset(cfg.outroDirection, cfg.outroDistance);

        var ox = introOff.x * (1 - introProgress) + outroOff.x * outroProgress;
        var oy = introOff.y * (1 - introProgress) + outroOff.y * outroProgress;

        var introAlpha = introProgress;
        var outroAlpha = 1 - outroProgress;
        var alpha      = Math.min(introAlpha, outroAlpha);
        alpha          = Math.max(0, Math.min(1, alpha));

        // Blur: combinamos intro blur (al principio) y outro blur (al final)
        var introBlurVal = cfg.introBlur * (1 - introProgress);
        var outroBlurVal = cfg.outroEnabled ? cfg.outroBlur * outroProgress : 0;
        var blurVal      = Math.max(introBlurVal, outroBlurVal);
        // Escalar blur para canvas (AE blur es mayor visualmente)
        var canvasBlur   = Math.round(blurVal * 0.4);

        ctx.save();
        ctx.globalAlpha = alpha * (cfg.introOpacity / 100 + (1 - cfg.introOpacity / 100) * introProgress);
        // Ajuste opacidad real: introOpacity es el valor de inicio (0 = invisible al arrancar)
        var opStart = cfg.introOpacity / 100;
        var opEnd   = cfg.outroEnabled ? (cfg.outroOpacity / 100) : 1;
        var opVal   = opStart + (1 - opStart) * introProgress;
        opVal       = opVal * (1 - outroProgress) + opEnd * outroProgress;
        ctx.globalAlpha = Math.max(0, Math.min(1, opVal));

        if (canvasBlur > 0) {
            ctx.filter = "blur(" + canvasBlur + "px)";
        } else {
            ctx.filter = "none";
        }

        // Calcular posición X acumulada
        var wx = startX;
        for (var j = 0; j < i; j++) wx += widths[j] + wordGap;

        ctx.fillStyle = "#ffffff";
        ctx.fillText(word, wx + ox, baseY + oy);
        ctx.restore();
    });

    previewRaf = requestAnimationFrame(drawFrame);
}

function restartPreview() {
    if (previewRaf) cancelAnimationFrame(previewRaf);
    previewStart = null;
    previewRaf   = requestAnimationFrame(drawFrame);
}

document.getElementById("btn-replay").addEventListener("click", function () {
    previewStart = null;
});

// ── Aplicar animación en AE ─────────────────────────────────────
document.getElementById("btn-apply").addEventListener("click", function () {
    readFields();
    setStatus("Aplicando...", "");

    // Build a self-contained evalScript call — pass each value as a literal
    // so there are zero JSON/quote escaping issues crossing the JS→JSX bridge
    var s = [
        'var cfg = {};',
        'cfg.introDuration      = ' + cfg.introDuration      + ';',
        'cfg.introDirection     = "' + cfg.introDirection     + '";',
        'cfg.introDistance      = ' + cfg.introDistance      + ';',
        'cfg.introOpacity       = ' + cfg.introOpacity       + ';',
        'cfg.introBlur          = ' + cfg.introBlur          + ';',
        'cfg.introEaseInfluence = ' + cfg.introEaseInfluence + ';',
        'cfg.outroEnabled       = ' + (cfg.outroEnabled ? 'true' : 'false') + ';',
        'cfg.outroDuration      = ' + cfg.outroDuration      + ';',
        'cfg.outroDirection     = "' + cfg.outroDirection     + '";',
        'cfg.outroDistance      = ' + cfg.outroDistance      + ';',
        'cfg.outroOpacity       = ' + cfg.outroOpacity       + ';',
        'cfg.outroBlur          = ' + cfg.outroBlur          + ';',
        'cfg.outroEaseInfluence = ' + cfg.outroEaseInfluence + ';',
        'cfg.basedOn            = "' + cfg.basedOn            + '";',
        'cfg.easeLow            = ' + cfg.easeLow            + ';',
        'cfg.easeHigh           = ' + cfg.easeHigh           + ';',
        'cfg.smoothness         = ' + cfg.smoothness         + ';',
        'runAnimation(cfg);'
    ].join(' ');

    // Test simple primero: verificar que evalScript funciona
    csInterface.evalScript('$.writeln("CEP OK"); "BRIDGE_OK"', function(ping) {
        if (ping !== "BRIDGE_OK") {
            setStatus("✗ Bridge JS→JSX no responde: " + ping, "error");
            return;
        }
        // Bridge OK, ahora ejecutar el script real
        csInterface.evalScript(s, function (result) {
            setStatus("Resultado: " + String(result), result === "OK" ? "ok" : "error");
        });
    });
});

function setStatus(msg, cls) {
    statusEl.textContent  = msg;
    statusEl.className    = cls;
}

// ── Init ────────────────────────────────────────────────────────
window.addEventListener("resize", function () {
    resizeCanvas();
});

resizeCanvas();
restartPreview();

// Cargar el JSX manualmente al iniciar el panel
// (más confiable que depender del ScriptPath del manifest)
(function loadJSX() {
    var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    var jsxPath = extPath + "/jsx/animate.jsx";
    csInterface.evalScript('$.evalFile("' + jsxPath + '")', function(result) {
        if (result === "undefined" || result === undefined) {
            setStatus("JSX cargado", "");
        } else if (result && result.indexOf("Error") !== -1) {
            setStatus("✗ Error cargando JSX: " + result, "error");
        }
    });
})();
