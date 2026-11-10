// PROTOTYPE, throwaway. Question: can the message box and the preview be one box, where what you type turns into
// sitelen pona in place? Four variants on the real page, ?variant=a..d, side by side in prototype/compare.html.
//
// How it works: the box is a contenteditable whose text is always the plain toki pona you typed. Each word sits in a
// span; a span in the sitelen pona font shows the word as its glyph (the font's ligatures do the converting), so the
// caret, the selection and copy all work on the letters. Every edit is applied to a string and the box is redrawn
// from it. The hidden textarea stays the app's source of truth, so Copy, Recents and the cheat sheet work unchanged.
(() => {
  "use strict";
  const { parseLine, state, textEl, SENTENCE_END, syncTheme, gloss, bare } = window.__proto;
  const root = document.documentElement;
  const VARIANTS = { a: "Word at the caret", b: "Instant + letter bubble", c: "Letters under glyphs", d: "Sentence at the caret" };
  let variant = VARIANTS[root.dataset.variant] ? root.dataset.variant : "a";
  root.dataset.variant = variant;

  // ---------- the box ----------
  const mk = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const shell = mk("div", "ed-shell"), ed = mk("div", "ed"), pop = mk("div", "ed-pop"), fc = mk("i", "fc");
  ed.id = "ed";
  ed.contentEditable = "plaintext-only";
  if (ed.contentEditable !== "plaintext-only") ed.contentEditable = "true";
  for (const [k, v] of Object.entries({ role: "textbox", "aria-multiline": "true", "aria-label": "Your message", autocapitalize: "off", autocorrect: "off", spellcheck: "false" })) ed.setAttribute(k, v);
  pop.hidden = true;
  // The settings chip and the send chips move from the preview frame to a row under the box; the preview section goes.
  // The grip moves into the box's corner as a copy, which leaves the textarea's listeners behind.
  const bar = mk("div", "ed-bar"), oldGrip = document.getElementById("grip"), grip = oldGrip.cloneNode(true);
  oldGrip.remove();
  bar.append(document.getElementById("opts-btn"), document.querySelector(".actions"));
  const tip = mk("div", "wpop"); // the app's own bubble for a tapped glyph: the glyph big, the word, its meaning
  // Both bubbles hang on the field, not the box: the box is its own stacking context, and the "Your message" label
  // on its top border would paint over a bubble above the first row.
  const host = document.querySelector(".field");
  shell.append(ed, grip);
  host.append(pop, tip);
  document.querySelector(".box").append(shell, bar);
  document.getElementById("stage").parentElement.hidden = true;
  textEl.tabIndex = -1;
  document.querySelector('label[for="text"]').addEventListener("click", (e) => { e.preventDefault(); ed.focus(); });

  // ---------- model ----------
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  const nativeSel = HTMLTextAreaElement.prototype.setSelectionRange;
  let text = valueDesc.get.call(textEl);
  let selA = text.length, selB = text.length; // anchor and focus, as offsets into text
  let focused = false, demo = false, composing = false, pointerDown = false;
  let segs = [], lastKey = "";
  let tapped = null; // where the tapped word starts in the text, while its bubble is up
  let undo = [], redo = [], lastPush = 0;

  // The app sets the textarea itself (Recents, New, the cheat sheet): follow it.
  Object.defineProperty(textEl, "value", {
    configurable: true,
    get() { return valueDesc.get.call(textEl); },
    set(v) { valueDesc.set.call(textEl, v); if (v !== text) { tapped = null; text = v; selA = selB = text.length; undo = []; redo = []; draw(); } },
  });
  textEl.focus = (o) => ed.focus(o);
  textEl.setSelectionRange = (a, b) => { nativeSel.call(textEl, a, b); selA = a; selB = b; draw(); };

  function parse() {
    segs = [];
    let base = 0, group = 0;
    for (const line of text.split("\n")) {
      for (const s of parseLine(line, state.names, base)) { s.group = group; segs.push(s); if (SENTENCE_END.test(s.t)) group++; }
      base += line.length + 1; group++;
    }
  }
  const live = () => (focused || demo) && selA === selB;
  const touching = () => (live() ? segs.findIndex((s) => s.from <= selA && selA <= s.to) : -1);
  // D: the sentence the caret is in. Between two words of an unfinished sentence it is still that sentence.
  function caretGroup() {
    if (!live()) return -1;
    const i = touching();
    if (i >= 0) return segs[i].group;
    let prev = null;
    for (const s of segs) { if (s.to <= selA) prev = s; else break; }
    if (prev && !SENTENCE_END.test(prev.t) && !text.slice(prev.to, selA).includes("\n")) return prev.group;
    return -1;
  }
  const key = () => [variant, state.names, demo, touching(), variant === "d" ? caretGroup() : 0].join("|");

  function build() {
    const frag = document.createDocumentFragment();
    const at = touching(), g = variant === "d" ? caretGroup() : -1;
    let pos = 0;
    segs.forEach((s, i) => {
      if (s.from < pos) return;
      if (s.from > pos) frag.append(text.slice(pos, s.from));
      const src = text.slice(s.from, s.to), span = mk("span"), cur = i === at;
      span.textContent = src;
      span.dataset.from = s.from;
      if (variant === "c") { span.className = "cell" + (s.glyph ? "" : " bad") + (cur ? " cur" : ""); span.dataset.g = s.glyph ? s.t : ""; }
      else if (!s.glyph) span.className = "w bad" + (cur ? " typing" : "");
      else {
        const rep = src !== s.t; // a name, a long glyph, a dropped comma: drawn differently from how it is typed
        const open = variant === "a" ? cur : variant === "d" ? s.group === g : rep && cur;
        if (open) span.className = "w open" + (cur ? " cur" : "");
        else if (rep) { span.className = "g rep"; span.dataset.g = s.t; }
        else span.className = "g" + (cur ? " cur" : "");
      }
      frag.append(span);
      pos = s.to;
    });
    if (pos < text.length) frag.append(text.slice(pos));
    if (demo) frag.append(fc);
    if (text.endsWith("\n")) { const br = mk("br"); br.dataset.s = "1"; frag.append(br); }
    ed.replaceChildren(frag);
  }

  // ---------- offsets in the text <-> places in the DOM ----------
  function offsetOf(node, off) {
    const r = document.createRange();
    r.setStart(ed, 0); r.setEnd(node, off);
    return r.toString().length;
  }
  function locate(o) {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    let n, acc = 0, last = null;
    while ((n = w.nextNode())) {
      const len = n.data.length;
      if (o < acc + len) return [n, o - acc];
      if (o === acc + len && !n.data.endsWith("\n")) return [n, len];
      acc += len; last = n;
    }
    return last ? [last, last.data.length] : [ed, 0];
  }
  function placeSel() {
    const [n1, o1] = locate(selA), [n2, o2] = selA === selB ? [n1, o1] : locate(selB);
    getSelection().setBaseAndExtent(n1, o1, n2, o2);
  }
  function readSel() {
    const s = getSelection();
    if (!s.rangeCount || !ed.contains(s.anchorNode)) return false;
    selA = offsetOf(s.anchorNode, s.anchorOffset); selB = offsetOf(s.focusNode, s.focusOffset);
    return true;
  }

  function draw() {
    const top = ed.scrollTop;
    parse(); build();
    ed.scrollTop = demo ? ed.scrollHeight : top;
    lastKey = key();
    if (focused && !demo && document.activeElement === ed) placeSel();
    placePop();
  }
  // Tap a glyph: the bubble the preview had, over the glyph in the box. A second tap, a tap elsewhere or any key clears it.
  function placeTip() {
    const s = tapped == null ? null : segs.find((x) => x.from === tapped), at = s && ed.querySelector('[data-from="' + tapped + '"]');
    const r = at && at.getBoundingClientRect(), b = ed.getBoundingClientRect();
    if (!at || r.bottom < b.top + 4 || r.top > b.bottom - 4) { tip.classList.remove("show"); return; }
    const typed = text.slice(s.from, s.to), part = (cls, t) => { const n = mk("span", cls); n.textContent = t; return n; };
    tip.replaceChildren(
      ...(s.glyph ? [part("wpop-glyph", s.t)] : []),
      part("wpop-word", s.glyph && !s.name && !s.long && s.t[0] !== "[" ? bare(s.t) || s.t : typed),
      part("wpop-meaning", gloss(s)));
    tip.className = "wpop show" + (s.t[0] === "[" || s.long || !s.glyph ? " wide" : "");
    const sh = host.getBoundingClientRect(), pw = tip.offsetWidth;
    tip.style.left = Math.max(6, Math.min(r.left + r.width / 2 - sh.left - pw / 2, host.clientWidth - 6 - pw)) + "px";
    tip.style.top = r.top - sh.top - tip.offsetHeight - 8 + "px";
  }
  function setTap(from) { tapped = from; placePop(); }
  // Read at pointerdown and acted on at pointerup (below): the box is redrawn around the caret in between, the pressed
  // span is gone by then, and the browser sends no click for a press on an element that has left the page.
  let downFrom = null;
  ed.addEventListener("pointerdown", (e) => { const sp = e.target.closest?.("span[data-from]"); downFrom = sp ? +sp.dataset.from : null; });
  const tapEnd = () => setTap(downFrom != null && getSelection().isCollapsed && downFrom !== tapped ? downFrom : null);
  ed.addEventListener("keydown", () => { if (tapped != null) setTap(null); });
  addEventListener("pointerdown", (e) => { if (tapped != null && !ed.contains(e.target)) setTap(null); });
  // The caret moved: redraw only when that changes which word or sentence is shown as letters.
  function refresh() { if (key() !== lastKey) draw(); else placePop(); }

  // B: the letters of the glyph at the caret, in a bubble over it, with the caret's place marked.
  function placePop() {
    placeTip();
    const cur = variant === "b" && live() && tapped == null ? ed.querySelector(".g.cur:not(.rep)") : null;
    pop.hidden = !cur;
    if (!cur) return;
    { const c = cur.getBoundingClientRect(), b = ed.getBoundingClientRect(); if (c.bottom < b.top + 4 || c.top > b.bottom - 4) { pop.hidden = true; return; } }
    const src = cur.textContent, k = Math.max(0, Math.min(src.length, selA - +cur.dataset.from));
    pop.replaceChildren(src.slice(0, k), mk("i"), src.slice(k));
    const r = cur.getBoundingClientRect(), s = host.getBoundingClientRect(), half = pop.offsetWidth / 2 + 6;
    pop.style.left = Math.max(half, Math.min(s.width - half, r.left + r.width / 2 - s.left)) + "px";
    pop.style.top = r.top - s.top - pop.offsetHeight - 8 + "px";
  }

  // ---------- editing ----------
  function pushOut() {
    valueDesc.set.call(textEl, text);
    try { nativeSel.call(textEl, Math.min(selA, selB), Math.max(selA, selB)); } catch {}
    textEl.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function remember(ins) {
    const now = Date.now();
    if (now - lastPush > 700 || /\s/.test(ins || " ")) { undo.push([text, selA, selB]); if (undo.length > 200) undo.shift(); }
    lastPush = now; redo = [];
  }
  function apply(a, b, ins) {
    remember(ins);
    tapped = null;
    text = text.slice(0, a) + ins + text.slice(b);
    selA = selB = a + ins.length;
    draw(); reveal(); pushOut();
  }
  // In a box with a set height, keep the caret in view after an edit.
  function reveal() {
    const s = getSelection();
    if (!ed.style.height || demo || !s.rangeCount || !ed.contains(s.focusNode)) return;
    const n = s.focusNode, r = s.getRangeAt(0).getClientRects()[0] || (n.nodeType === 1 ? n : n.parentElement).getBoundingClientRect();
    const b = ed.getBoundingClientRect();
    if (r.bottom > b.bottom - 10) ed.scrollTop += r.bottom - b.bottom + 10;
    else if (r.top < b.top + 10) ed.scrollTop -= b.top + 10 - r.top;
  }

  // ---------- the grip: the box grows with the text until you pull it; then it keeps that height and scrolls ----------
  {
    const MIN = 104, KEY = "ilo-sitelen:proto-box-h", maxH = () => Math.max(MIN, Math.round(innerHeight * 0.7));
    const setH = (h) => {
      h = Math.max(MIN, Math.min(maxH(), Math.round(h)));
      ed.style.height = h + "px";
      grip.setAttribute("aria-valuenow", h); grip.setAttribute("aria-valuemax", maxH());
      try { localStorage.setItem(KEY, h); } catch {}
      placePop();
    };
    let from = null, saved = 0;
    try { saved = +localStorage.getItem(KEY) || 0; } catch {}
    if (saved) setH(saved);
    grip.addEventListener("pointerdown", (e) => { from = { y: e.clientY, h: ed.offsetHeight }; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
    grip.addEventListener("pointermove", (e) => { if (from) setH(from.h + e.clientY - from.y); });
    for (const ev of ["pointerup", "pointercancel"]) grip.addEventListener(ev, () => { from = null; });
    grip.addEventListener("keydown", (e) => { const d = { ArrowUp: -24, ArrowDown: 24 }[e.key]; if (d) { e.preventDefault(); setH(ed.offsetHeight + d); } });
    // A double tap on the grip lets the box grow with the text again.
    grip.addEventListener("dblclick", () => { ed.style.height = ""; try { localStorage.removeItem(KEY); } catch {} placePop(); });
    ed.addEventListener("scroll", () => placePop());
  }
  const range = () => [Math.min(selA, selB), Math.max(selA, selB)];

  ed.addEventListener("beforeinput", (e) => {
    if (e.isComposing || composing) return; // an IME writes into the DOM; the input handler reads it back
    const t = e.inputType;
    let ins;
    if (t === "insertText" || t === "insertReplacementText") ins = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
    else if (t === "insertLineBreak" || t === "insertParagraph") ins = "\n";
    // A plain-text box gets the pasted text in e.data and no dataTransfer, like a textarea; a rich one the other way round.
    else if (t === "insertFromPaste" || t === "insertFromDrop" || t === "insertFromYank") ins = (e.data ?? e.dataTransfer?.getData("text/plain") ?? "").replace(/\r\n?/g, "\n");
    else if (t.startsWith("delete")) ins = "";
    else return;
    e.preventDefault();
    readSel();
    let [a, b] = range();
    if (a === b && t.startsWith("delete")) {
      const tr = e.getTargetRanges?.()[0];
      if (t === "deleteContentBackward") a = Math.max(0, a - 1);
      else if (t === "deleteContentForward") b = Math.min(text.length, b + 1);
      else if (tr && ed.contains(tr.startContainer)) { a = offsetOf(tr.startContainer, tr.startOffset); b = offsetOf(tr.endContainer, tr.endOffset); }
      if (a === b && /Backward/.test(t)) a = text.slice(0, a).search(/\S+\s*$/) < 0 ? 0 : text.slice(0, a).search(/\S+\s*$/);
    }
    if (a === b && !ins) return;
    apply(a, b, ins);
  });
  function fromDom() {
    let out = "";
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) out += c.data;
        else if (c.nodeName === "BR") { if (!c.dataset.s) out += "\n"; }
        else { if (c.nodeName === "DIV" && out && !out.endsWith("\n")) out += "\n"; walk(c); }
      }
    })(ed);
    readSel();
    if (out === text) return;
    remember(" ");
    tapped = null;
    text = out;
    draw(); pushOut();
  }
  ed.addEventListener("input", (e) => { if (!composing && !e.isComposing) fromDom(); });
  ed.addEventListener("compositionstart", () => { composing = true; });
  ed.addEventListener("compositionend", () => { composing = false; fromDom(); });
  // Paste is taken from the clipboard event itself, so it does not depend on what beforeinput carries.
  ed.addEventListener("paste", (e) => {
    const t = (e.clipboardData?.getData("text/plain") ?? "").replace(/\r\n?/g, "\n");
    if (!t) return;
    e.preventDefault();
    readSel();
    apply(...range(), t);
  });
  for (const ev of ["copy", "cut"]) ed.addEventListener(ev, (e) => {
    readSel();
    const [a, b] = range();
    if (a === b) return;
    e.clipboardData.setData("text/plain", text.slice(a, b));
    e.preventDefault();
    if (ev === "cut") apply(a, b, "");
  });
  ed.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
    e.preventDefault();
    const from = e.shiftKey ? redo : undo, to = e.shiftKey ? undo : redo;
    if (!from.length) return;
    to.push([text, selA, selB]);
    [text, selA, selB] = from.pop();
    draw(); pushOut();
  });

  ed.addEventListener("focus", () => { focused = true; setTimeout(() => { if (readSel()) refresh(); }, 0); });
  ed.addEventListener("blur", () => { focused = false; refresh(); });
  ed.addEventListener("pointerdown", () => { pointerDown = true; });
  addEventListener("pointerup", () => { if (pointerDown) { pointerDown = false; if (focused && readSel()) refresh(); tapEnd(); } });
  document.addEventListener("selectionchange", () => {
    if (composing || demo || document.activeElement !== ed || !readSel()) return;
    try { nativeSel.call(textEl, ...range()); textEl.dispatchEvent(new Event("select")); } catch {}
    if (!pointerDown) refresh();
  });
  document.getElementById("names").addEventListener("change", () => draw());
  addEventListener("resize", placePop);

  // ---------- the compare page drives the frames ----------
  let demoTimer = 0;
  function play(str) {
    clearInterval(demoTimer);
    ed.blur();
    demo = true; text = ""; selA = selB = 0; draw(); pushOut();
    let i = 0;
    demoTimer = setInterval(() => {
      if (i < str.length) return apply(text.length, text.length, str[i++]);
      clearInterval(demoTimer);
      setTimeout(() => { demo = false; draw(); }, 1600);
    }, 170);
  }
  addEventListener("message", (e) => {
    const d = e.data || {};
    if (typeof d.text === "string") { clearInterval(demoTimer); demo = false; text = d.text; selA = selB = text.length; draw(); pushOut(); }
    if (typeof d.demo === "string") play(d.demo);
    if (d.theme) { root.dataset.theme = d.theme; syncTheme(); }
    if (d.gs) ed.style.setProperty("--gs", d.gs + "px");
  });

  // ---------- B or C from Settings: a Letters switch, on is C (letters under the glyphs), off is B ----------
  // The choice is kept in the address, so a reload keeps it and the frames of the compare page stay apart.
  let barLabel = null;
  const lettersEl = mk("input", "switch");
  lettersEl.type = "checkbox"; lettersEl.id = "letters"; lettersEl.checked = variant === "c";
  {
    const row = mk("label", "setting"), part = (cls, t) => { const n = mk("span", cls); n.textContent = t; return n; };
    const glyph = part("setting-glyph", "lukin"); glyph.setAttribute("aria-hidden", "true");
    row.append(glyph, part("setting-name", "Letters"), part("setting-help", "Show each word's letters under its glyph"), lettersEl);
    document.querySelector(".opts-card").append(row);
  }
  lettersEl.addEventListener("change", () => {
    variant = lettersEl.checked ? "c" : "b";
    root.dataset.variant = variant;
    const u = new URL(location.href); u.searchParams.set("variant", variant); history.replaceState(null, "", u);
    if (barLabel) barLabel.textContent = variant.toUpperCase() + " — " + VARIANTS[variant];
    draw();
  });

  // ---------- the switcher, when the page is opened on its own ----------
  if (window.parent === window) {
    const keys = Object.keys(VARIANTS), bar = mk("div", "pv-bar"), label = barLabel = mk("span");
    const go = (d) => { const u = new URL(location.href); u.searchParams.set("variant", keys[(keys.indexOf(variant) + d + keys.length) % keys.length]); location.href = u; };
    const btn = (t, d) => { const b = mk("button"); b.type = "button"; b.textContent = t; b.addEventListener("click", () => go(d)); return b; };
    label.textContent = variant.toUpperCase() + " — " + VARIANTS[variant];
    bar.append(btn("‹", -1), label, btn("›", 1));
    document.body.append(bar);
    addEventListener("keydown", (e) => {
      if (e.target.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1);
    });
  }

  draw();
  document.fonts.ready.then(placePop);
})();
