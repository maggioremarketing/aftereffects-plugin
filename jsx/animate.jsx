// animate.jsx — lógica de After Effects
// Llamado desde main.js via CSInterface.evalScript()

function toNumber(v, fallback) {
    if (v === null || v === undefined || v === "") return fallback;
    var n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? fallback : n;
}

function isTextLayer(layer) {
    try { return layer.property("Source Text") !== null; } catch (e) { return false; }
}

function easeBoth(prop, keyIndex, inInfluence, outInfluence) {
    var safeIn  = (inInfluence  < 1) ? 1 : inInfluence;
    var safeOut = (outInfluence < 1) ? 1 : outInfluence;
    var easeIn  = new KeyframeEase(0, safeIn);
    var easeOut = new KeyframeEase(0, safeOut);
    prop.setTemporalEaseAtKey(keyIndex, [easeIn], [easeOut]);
}

function getDirectionOffset(direction, distance) {
    switch (direction) {
        case "Arriba":    return [0,  distance, 0];
        case "Abajo":     return [0, -distance, 0];
        case "Izquierda": return [ distance, 0, 0];
        case "Derecha":   return [-distance, 0, 0];
        default:          return [0,  distance, 0];
    }
}

function getBasedOnValue(label) {
    switch (label) {
        case "Characters":                  return 1;
        case "Characters Excluding Spaces": return 2;
        case "Words":                       return 3;
        case "Lines":                       return 4;
        default:                            return 3;
    }
}

function addTextAnimator(layer, animatorName, opacityValue, blurValue, posArray) {
    var textGroup  = layer.property("Text");
    var animators  = textGroup.property("Animators");
    var animator   = animators.addProperty("ADBE Text Animator");
    animator.name  = animatorName;

    var animatorProps = animator.property("ADBE Text Animator Properties");

    // Opacity
    try {
        var opacityProp = animatorProps.addProperty("ADBE Text Opacity");
        if (opacityProp) opacityProp.setValue(toNumber(opacityValue, 0));
    } catch (e) {}

    // Blur
    try {
        var blurProp = null;
        var blurNames = ["ADBE Text Blur 2", "ADBE Text Blur", "Blur"];
        for (var b = 0; b < blurNames.length; b++) {
            try {
                var candidate = animatorProps.addProperty(blurNames[b]);
                if (candidate && candidate.setValue) { blurProp = candidate; break; }
            } catch (eBlur) {}
        }
        if (blurProp) {
            try {
                blurProp.setValue([toNumber(blurValue, 0), toNumber(blurValue, 0)]);
            } catch (e) {
                try { blurProp.setValue(toNumber(blurValue, 0)); } catch (e2) {}
            }
        }
    } catch (e) {}

    // Position
    try {
        var positionProp = null;
        try { positionProp = animatorProps.addProperty("ADBE Text Position 3D"); } catch (e1) {}
        if (!positionProp) {
            try { positionProp = animatorProps.addProperty("ADBE Text Position"); } catch (e2) {}
        }
        if (positionProp) {
            if (positionProp.value.length === 3) {
                positionProp.setValue([toNumber(posArray[0], 0), toNumber(posArray[1], 0), toNumber(posArray[2], 0)]);
            } else {
                positionProp.setValue([toNumber(posArray[0], 0), toNumber(posArray[1], 0)]);
            }
        }
    } catch (e) {}

    var selectors = animator.property("ADBE Text Selectors");
    var selector  = selectors.addProperty("ADBE Text Selector");
    return { animator: animator, selector: selector };
}

function setSelectorAdvanced(selector, cfg) {
    var advanced = selector.property("ADBE Text Range Advanced");
    if (!advanced) return;

    var basedOn = advanced.property("ADBE Text Range Type2") || advanced.property("Based On");
    if (basedOn) try { basedOn.setValue(getBasedOnValue(cfg.basedOn)); } catch (e) {}

    var units = advanced.property("ADBE Text Range Units") || advanced.property("Units");
    if (units) try { units.setValue(1); } catch (e) {}

    var shape = advanced.property("ADBE Text Range Shape") || advanced.property("Shape");
    if (shape) try { shape.setValue(2); } catch (e) {}

    var smoothness = advanced.property("ADBE Text Range Smoothness") || advanced.property("Smoothness");
    if (smoothness) try { smoothness.setValue(cfg.smoothness); } catch (e) {}

    var easeLow = advanced.property("ADBE Text Range Ease Low") || advanced.property("Ease Low");
    if (easeLow) try { easeLow.setValue(cfg.easeLow); } catch (e) {}

    var easeHigh = advanced.property("ADBE Text Range Ease High") || advanced.property("Ease High");
    if (easeHigh) try { easeHigh.setValue(cfg.easeHigh); } catch (e) {}

    var randomize = advanced.property("ADBE Text Range Randomize") || advanced.property("Randomize Order");
    if (randomize) try { randomize.setValue(0); } catch (e) {}
}

function animateIntro(selector, layer, cfg) {
    var offset = selector.property("ADBE Text Percent Offset") || selector.property("Offset");
    if (!offset) return;
    var t1 = layer.inPoint;
    var t2 = Math.min(layer.inPoint + cfg.introDuration, layer.outPoint);
    offset.setValueAtTime(t1, -100);
    offset.setValueAtTime(t2,  100);
    easeBoth(offset, 1, 20, 20);
    easeBoth(offset, 2, cfg.introEaseInfluence, 20);
}

function animateOutro(selector, layer, cfg) {
    var offset = selector.property("ADBE Text Percent Offset") || selector.property("Offset");
    if (!offset) return;
    var t1 = Math.max(layer.outPoint - cfg.outroDuration, layer.inPoint);
    var t2 = layer.outPoint;
    offset.setValueAtTime(t1,  100);
    offset.setValueAtTime(t2, -100);
    easeBoth(offset, 1, 20, cfg.outroEaseInfluence);
    easeBoth(offset, 2, 20, 20);
}

// Punto de entrada — recibe objeto cfg construido directamente desde main.js
function runAnimation(cfg) {
    if (!cfg) return "ERROR: cfg no definido";

    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return "ERROR: Abre una composición.";
    if (comp.selectedLayers.length === 0) return "ERROR: Selecciona al menos una capa de texto.";

    app.beginUndoGroup("Animador de texto CEP");

    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var layer = comp.selectedLayers[i];
        if (!isTextLayer(layer)) continue;

        var introPos = getDirectionOffset(cfg.introDirection, cfg.introDistance);

        var intro = addTextAnimator(layer, "Entrada", cfg.introOpacity, cfg.introBlur, introPos);
        setSelectorAdvanced(intro.selector, cfg);
        animateIntro(intro.selector, layer, cfg);

        if (cfg.outroEnabled) {
            var outroPos = getDirectionOffset(cfg.outroDirection, cfg.outroDistance);
            var outro = addTextAnimator(layer, "Salida", cfg.outroOpacity, cfg.outroBlur, outroPos);
            setSelectorAdvanced(outro.selector, cfg);
            animateOutro(outro.selector, layer, cfg);
        }
    }

    app.endUndoGroup();
    return "OK";
}
