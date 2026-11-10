/* Helpers de interface: criação de elementos sem innerHTML (sem risco de XSS com textos do mestre) */

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value" || k === "checked" || k === "open") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

const ICONES = {
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A16.5 16.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  undo: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M6.5 17H20v4H6.5A2.5 2.5 0 0 1 4 19.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
};

/* ícone inline; "sparkle" é preenchido, os demais são de traço */
export function icon(nome, size = 16) {
  const span = document.createElement("span");
  span.className = "ico";
  span.style.width = span.style.height = `${size}px`;
  if (nome === "sparkle") {
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>`;
  } else {
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] ?? ""}</svg>`;
  }
  return span;
}

/* Cabeçalho padrão dos painéis */
export function cabecalho(titulo, sub, ...acoes) {
  return h("header", { class: "hdr" },
    h("div", { class: "hdr-ico" }, icon("sparkle", 18)),
    h("div", { class: "hdr-txt" },
      h("div", { class: "hdr-title" }, titulo),
      sub ? h("div", { class: "hdr-sub" }, sub) : null
    ),
    ...acoes
  );
}

export function pill(tipo, texto, nomeIcone) {
  return h("span", { class: `pill pill-${tipo}` }, nomeIcone ? icon(nomeIcone, 12) : null, texto);
}
