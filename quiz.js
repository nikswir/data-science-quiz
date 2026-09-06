(() => {
  const $ = id => document.getElementById(id);
  const quizData = CardStore.effectiveData();
  const params = new URLSearchParams(location.search);
  const available = Object.keys(quizData.topics);
  const requested = (params.get("topics") || available.join(",")).split(",");
  const topicIds = requested.filter(x => available.includes(x)).sort();
  if (!topicIds.length) topicIds.push(...available);
  const cards = topicIds.flatMap(code => quizData.topics[code].cards);
  if (!cards.length) {
    $("cardView").style.display = "none"; $("controls").style.display = "none";
    $("result").classList.add("visible"); $("resultTitle").textContent = "No active cards";
    $("resultText").textContent = "Restore cards from the trash or choose another topic.";
    $("newSession").style.display = "none";
    return;
  }
  const byId = Object.fromEntries(cards.map(card => [card.ID, card]));
  const allIds = cards.map(card => card.ID);
  const storageKey = "data-science-quiz-session-v3:" + topicIds.join(",");
  let revealed = false;

  const shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const fresh = () => ({ version:3, stage:"training", primary:[...allIds], finalists:[], current:null, finalOrder:[], finalPosition:0, finalFailed:[], attempts:0, finals:0 });
  const valid = state => state && state.version === 3 && [...state.primary, ...state.finalists].every(id => byId[id]) && new Set([...state.primary, ...state.finalists]).size === allIds.length;
  let state;
  try { state = JSON.parse(localStorage.getItem(storageKey)); } catch (_) {}
  if (!valid(state) || state.stage === "passed") state = fresh();

  function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
  function randomPrimary(exclude) {
    const choices = state.primary.length > 1 ? state.primary.filter(id => id !== exclude) : state.primary;
    return choices[Math.floor(Math.random() * choices.length)];
  }
  function beginFinal() {
    state.stage = "final"; state.finals++;
    state.finalOrder = shuffle(allIds); state.finalPosition = 0; state.finalFailed = [];
    state.current = state.finalOrder[0];
  }
  function render() {
    if (!state.current && state.stage === "training") state.current = randomPrimary(null);
    if (state.stage === "passed") return showResult();
    const card = byId[state.current];
    revealed = false; document.body.classList.remove("revealed");
    $("answer").classList.remove("visible"); $("longBox").open = false; $("readingBox").open = false;
    $("topic").textContent = card.Topic; $("question").textContent = card.Question;
    $("short").innerHTML = card.Short; $("long").innerHTML = card.Long; $("readings").innerHTML = card.Readings;
    $("longBox").hidden = !card.Long.trim();
    $("readingBox").hidden = !card.Readings.trim();
    $("editCard").href = `edit.html?id=${encodeURIComponent(card.ID)}&return=${encodeURIComponent("quiz.html" + location.search)}`;
    const final = state.stage === "final";
    $("stage").textContent = final ? `Final ${state.finals}` : "Training";
    $("stage").classList.toggle("final", final);
    const done = final ? state.finalPosition : state.finalists.length;
    $("counter").textContent = `${final ? done + 1 : done} / ${allIds.length}`;
    $("progress").style.width = `${done / allIds.length * 100}%`;
    $("poolStatus").textContent = final ? `${state.finalFailed.length} failed in this final` : `${state.primary.length} in training · ${state.finalists.length} qualified for final`;
    save(); window.scrollTo({top:0, behavior:"instant"});
  }
  function reveal() {
    revealed = true; document.body.classList.add("revealed"); $("answer").classList.add("visible");
    if (window.MathJax?.typesetPromise) MathJax.typesetPromise([$("answer")]).catch(console.error);
  }
  function grade(correct) {
    if (!revealed) return;
    CardStore.recordResult(state.current, correct);
    state.attempts++;
    if (state.stage === "training") {
      const previous = state.current;
      if (correct) {
        state.primary = state.primary.filter(id => id !== previous);
        if (!state.finalists.includes(previous)) state.finalists.push(previous);
      }
      if (!state.primary.length) beginFinal();
      else state.current = randomPrimary(previous);
    } else {
      if (!correct && !state.finalFailed.includes(state.current)) state.finalFailed.push(state.current);
      state.finalPosition++;
      if (state.finalPosition < state.finalOrder.length) state.current = state.finalOrder[state.finalPosition];
      else if (!state.finalFailed.length) state.stage = "passed";
      else {
        state.stage = "training"; state.primary = [...state.finalFailed];
        state.finalists = allIds.filter(id => !state.primary.includes(id));
        state.current = randomPrimary(null); state.finalOrder = []; state.finalFailed = [];
      }
    }
    save(); render();
  }
  function showResult() {
    save(); $("cardView").style.display = "none"; $("controls").style.display = "none";
    $("result").classList.add("visible");
  }
  function restart() {
    state = fresh(); save();
    $("cardView").style.display = "block"; $("controls").style.display = "block";
    $("result").classList.remove("visible"); render();
  }
  $("showAnswer").addEventListener("click", reveal);
  $("wrong").addEventListener("click", () => grade(false));
  $("correct").addEventListener("click", () => grade(true));
  $("newSession").addEventListener("click", restart);
  $("trashCard").addEventListener("click", () => { CardStore.trash(state.current); location.reload(); });
  $("resetSession").addEventListener("click", () => {
    if (confirm("Start this session again from the beginning?")) restart();
  });
  if (location.protocol === "https:" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  render();
})();
