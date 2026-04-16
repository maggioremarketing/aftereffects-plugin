# Animador de Texto — Extensión CEP para After Effects

Panel dockeable con previsualización en tiempo real.

---

## Instalación

### 1. Activar modo debug de CEP (solo la primera vez)

**Windows:**
Abre el Editor de Registro (`regedit`) y ve a:
```
HKEY_CURRENT_USER\Software\Adobe\CSXS.12
```
Crea un valor String llamado `PlayerDebugMode` con valor `1`.

> Si usás AE 2022 o anterior, la clave puede ser `CSXS.10` o `CSXS.9`.
> Para saber cuál, fijate en la versión de CEP que usa tu AE.

**Mac:**
Abre Terminal y ejecuta:
```bash
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

---

### 2. Copiar la carpeta de la extensión

Copia la carpeta `animador-texto` completa a:

**Windows:**
```
C:\Users\<TuUsuario>\AppData\Roaming\Adobe\CEP\extensions\
```

**Mac:**
```
~/Library/Application Support/Adobe/CEP/extensions/
```

La estructura final debe quedar así:
```
extensions/
  animador-texto/
    CSXS/
      manifest.xml
    jsx/
      animate.jsx
    css/
      style.css
    js/
      main.js
    index.html
```

---

### 3. Abrir en After Effects

1. Reiniciá After Effects
2. Andá a **Window → Extensions → Animador de Texto**
3. El panel aparece y se puede dockear como cualquier panel nativo

---

## Uso

1. Abrí una composición
2. Seleccioná una o más capas de texto
3. Ajustá los parámetros — la previsualización se actualiza en tiempo real
4. Hacé clic en **Aplicar**

---

## Shortcut (opcional)

Para asignar un shortcut de teclado que abra/enfoque el panel, instalá **KBar** (gratuito) desde aescripts.com y agregá un botón que ejecute:

```javascript
var ext = new CSInterface();
ext.requestOpenExtension("com.tudominio.animadortexto.panel", "");
```

---

## Notas

- La previsualización es una **simulación visual** en canvas — no es un render real de AE, pero refleja timing, dirección, blur y opacidad fielmente.
- El botón **↺ Repetir** reinicia la animación de preview.
- La extensión usa CEP 12 y es compatible con After Effects 2025/2026.
