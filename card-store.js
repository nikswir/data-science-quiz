(() => {
  const KEY = "data-science-quiz-library-v1";
  const blank = () => ({ version: 1, edits: {}, trash: [], deleted: [] });
  const baseCards = () => Object.values(window.QUIZ_DATA.topics).flatMap(topic => topic.cards);
  const baseIds = () => new Set(baseCards().map(card => card.ID));

  function load() {
    let value;
    try { value = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    if (!value || value.version !== 1 || typeof value.edits !== "object") return blank();
    value.trash = Array.isArray(value.trash) ? value.trash : [];
    value.deleted = Array.isArray(value.deleted) ? value.deleted : [];
    return value;
  }
  const save = state => localStorage.setItem(KEY, JSON.stringify(state));
  const clone = value => JSON.parse(JSON.stringify(value));

  function effectiveData(includeTrash = false) {
    const data = clone(window.QUIZ_DATA);
    const state = load();
    const hidden = new Set(state.deleted.concat(includeTrash ? [] : state.trash));
    for (const topic of Object.values(data.topics)) {
      topic.cards = topic.cards.filter(card => !hidden.has(card.ID)).map(card => ({ ...card, ...(state.edits[card.ID] || {}) }));
    }
    return data;
  }

  function find(id, original = false) {
    const card = baseCards().find(item => item.ID === id);
    if (!card) return null;
    return original ? clone(card) : { ...clone(card), ...(load().edits[id] || {}) };
  }

  function sanitize(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    template.content.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button").forEach(node => node.remove());
    template.content.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attr => {
        if (attr.name.toLowerCase().startsWith("on") || ((attr.name === "href" || attr.name === "src") && /^\s*javascript:/i.test(attr.value))) node.removeAttribute(attr.name);
      });
    });
    return template.innerHTML;
  }

  function edit(id, fields) {
    if (!baseIds().has(id)) throw new Error("Unknown card");
    const allowed = ["Topic", "Question", "Short", "Long", "Readings"];
    const clean = {};
    for (const field of allowed) {
      if (typeof fields[field] !== "string") continue;
      clean[field] = field === "Topic" || field === "Question" ? fields[field].trim() : sanitize(fields[field]);
    }
    const state = load(); state.edits[id] = clean; save(state);
  }
  function resetEdit(id) { const state = load(); delete state.edits[id]; save(state); }
  function trash(id) {
    const state = load();
    if (!state.trash.includes(id) && !state.deleted.includes(id)) state.trash.push(id);
    save(state);
  }
  function restore(id) { const state = load(); state.trash = state.trash.filter(value => value !== id); save(state); }
  function emptyTrash() {
    const state = load();
    state.deleted = [...new Set(state.deleted.concat(state.trash))];
    state.trash.forEach(id => delete state.edits[id]);
    state.trash = []; save(state);
  }
  function isEdited(id) { return Boolean(load().edits[id]); }
  function inTrash(id) { return load().trash.includes(id); }
  function trashCards() { return load().trash.map(id => find(id)).filter(Boolean); }

  function backup() {
    return JSON.stringify({ app: "Data Science Quiz", exportedAt: new Date().toISOString(), library: load() }, null, 2);
  }
  function importBackup(text) {
    const parsed = JSON.parse(text);
    const candidate = parsed.library || parsed;
    if (!candidate || candidate.version !== 1 || typeof candidate.edits !== "object") throw new Error("Unsupported backup file");
    const ids = baseIds();
    const state = blank();
    for (const [id, fields] of Object.entries(candidate.edits)) {
      if (!ids.has(id) || !fields || typeof fields !== "object") continue;
      state.edits[id] = {};
      for (const field of ["Topic", "Question", "Short", "Long", "Readings"]) {
        if (typeof fields[field] === "string") state.edits[id][field] = fields[field];
      }
    }
    state.trash = [...new Set((candidate.trash || []).filter(id => ids.has(id)))];
    state.deleted = [...new Set((candidate.deleted || []).filter(id => ids.has(id)))];
    save(state);
  }

  window.CardStore = { load, effectiveData, find, edit, resetEdit, trash, restore, emptyTrash, isEdited, inTrash, trashCards, backup, importBackup };
})();
