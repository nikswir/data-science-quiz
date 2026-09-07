(() => {
  const KEY = "data-science-quiz-library-v1";
  const blank = () => ({ version: 1, updatedAt: null, edits: {}, custom: {}, trash: [], deleted: [], mastery: {}, sessions: {} });
  const clone = value => JSON.parse(JSON.stringify(value));
  const builtInCards = () => Object.values(window.QUIZ_DATA.topics).flatMap(topic => topic.cards);

  function load() {
    let value;
    try { value = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    if (!value || value.version !== 1 || typeof value.edits !== "object") return blank();
    value.custom = value.custom && typeof value.custom === "object" ? value.custom : {};
    value.mastery = value.mastery && typeof value.mastery === "object" ? value.mastery : {};
    value.sessions = value.sessions && typeof value.sessions === "object" ? value.sessions : {};
    value.trash = Array.isArray(value.trash) ? value.trash : [];
    value.deleted = Array.isArray(value.deleted) ? value.deleted : [];
    return value;
  }
  const save = state => {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("cardstorechange", { detail: clone(state) }));
  };
  const replaceState = state => {
    const next = { ...blank(), ...clone(state), version: 1 };
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("cardstoreloaded", { detail: clone(next) }));
  };
  const allKnownCards = state => builtInCards().concat(Object.values(state.custom));
  const knownIds = state => new Set(allKnownCards(state).map(card => card.ID));

  function effectiveData(includeTrash = false) {
    const data = clone(window.QUIZ_DATA);
    const state = load();
    for (const card of Object.values(state.custom)) {
      if (data.topics[card.Deck]) data.topics[card.Deck].cards.push(clone(card));
    }
    const hidden = new Set(state.deleted.concat(includeTrash ? [] : state.trash));
    for (const topic of Object.values(data.topics)) {
      topic.cards = topic.cards.filter(card => !hidden.has(card.ID)).map(card => ({ ...card, ...(state.edits[card.ID] || {}) }));
    }
    return data;
  }

  function find(id, original = false) {
    const state = load();
    const card = allKnownCards(state).find(item => item.ID === id);
    if (!card) return null;
    return original ? clone(card) : { ...clone(card), ...(state.edits[id] || {}) };
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

  function cleanFields(fields) {
    const clean = {};
    for (const field of ["Topic", "Question", "Short", "Long", "Readings"]) {
      if (typeof fields[field] !== "string") continue;
      clean[field] = field === "Topic" || field === "Question" ? fields[field].trim() : sanitize(fields[field]);
    }
    return clean;
  }

  function edit(id, fields) {
    const state = load();
    if (!knownIds(state).has(id)) throw new Error("Unknown card");
    const clean = cleanFields(fields);
    const original = allKnownCards(state).find(card => card.ID === id);
    const changed = Object.fromEntries(Object.entries(clean).filter(([field, value]) => value !== original[field]));
    if (Object.keys(changed).length) state.edits[id] = changed;
    else delete state.edits[id];
    save(state);
  }
  function create(deck, fields) {
    if (!window.QUIZ_DATA.topics[deck]) throw new Error("Unknown topic");
    const state = load();
    let id;
    do { id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; } while (knownIds(state).has(id));
    const clean = cleanFields(fields);
    state.custom[id] = { ID: id, Deck: deck, ...clean };
    save(state); return id;
  }
  function resetEdit(id) { const state = load(); delete state.edits[id]; save(state); }
  function isCustom(id) { return Boolean(load().custom[id]); }
  function trash(id) {
    const state = load();
    if (knownIds(state).has(id) && !state.trash.includes(id) && !state.deleted.includes(id)) state.trash.push(id);
    save(state);
  }
  function restore(id) { const state = load(); state.trash = state.trash.filter(value => value !== id); save(state); }
  function emptyTrash() {
    const state = load();
    for (const id of state.trash) {
      if (state.custom[id]) delete state.custom[id];
      else state.deleted.push(id);
      delete state.edits[id]; delete state.mastery[id];
    }
    state.deleted = [...new Set(state.deleted)]; state.trash = []; save(state);
  }
  function isEdited(id) { return Boolean(load().edits[id]); }
  function trashCards() { const state = load(); return state.trash.map(id => find(id)).filter(Boolean); }

  function recordResult(id, correct) {
    const state = load();
    const previous = state.mastery[id] || { correct: 0, wrong: 0 };
    state.mastery[id] = {
      status: correct ? "correct" : "wrong",
      correct: previous.correct + (correct ? 1 : 0), wrong: previous.wrong + (correct ? 0 : 1),
      updatedAt: new Date().toISOString(),
    };
    save(state);
  }
  function progress(cards) {
    const mastery = load().mastery;
    const result = { correct: 0, wrong: 0, unseen: 0, total: cards.length };
    for (const card of cards) {
      const status = mastery[card.ID]?.status;
      if (status === "correct") result.correct++;
      else if (status === "wrong") result.wrong++;
      else result.unseen++;
    }
    return result;
  }
  function resetProgress() { const state = load(); state.mastery = {}; save(state); }
  function getSession(key) { return clone(load().sessions[key] || null); }
  function setSession(key, value) { const state = load(); state.sessions[key] = clone(value); save(state); }

  function backup() {
    return JSON.stringify({ app: "Data Science Quiz", exportedAt: new Date().toISOString(), library: load() }, null, 2);
  }
  function importBackup(text) {
    const parsed = JSON.parse(text);
    const candidate = parsed.library || parsed;
    if (!candidate || candidate.version !== 1 || typeof candidate.edits !== "object") throw new Error("Unsupported backup file");
    const state = blank();
    for (const [id, card] of Object.entries(candidate.custom || {})) {
      if (!card || !window.QUIZ_DATA.topics[card.Deck]) continue;
      state.custom[id] = { ID: id, Deck: card.Deck, ...cleanFields(card) };
    }
    const ids = new Set(builtInCards().map(card => card.ID).concat(Object.keys(state.custom)));
    for (const [id, fields] of Object.entries(candidate.edits)) {
      if (ids.has(id) && fields && typeof fields === "object") state.edits[id] = cleanFields(fields);
    }
    state.trash = [...new Set((candidate.trash || []).filter(id => ids.has(id)))];
    state.deleted = [...new Set((candidate.deleted || []).filter(id => ids.has(id)))];
    for (const [id, value] of Object.entries(candidate.mastery || {})) {
      if (!ids.has(id) || !["correct", "wrong"].includes(value?.status)) continue;
      state.mastery[id] = { status: value.status, correct: Number(value.correct) || 0, wrong: Number(value.wrong) || 0, updatedAt: value.updatedAt || null };
    }
    save(state);
  }

  window.CardStore = { load, replaceState, effectiveData, find, edit, create, resetEdit, isCustom, trash, restore, emptyTrash, isEdited, trashCards, recordResult, progress, resetProgress, getSession, setSession, backup, importBackup };
})();
