(() => {
  const params = new URLSearchParams(location.search);
  const available = Object.keys(QUIZ_DATA.topics);
  const selected = (params.get("topics") || available[0]).split(",").filter(code => available.includes(code));
  const topicIds = selected.length ? selected : [available[0]];
  const cards = topicIds.flatMap(code => QUIZ_DATA.topics[code].cards);
  const names = topicIds.map(code => `Topic ${code}: ${QUIZ_DATA.topics[code].title}`);
  document.getElementById("previewTitle").textContent = names.join(" + ");
  document.getElementById("previewCount").textContent = `${cards.length} questions`;
  document.getElementById("previewCards").innerHTML = cards.map((card, index) => `
    <article class="preview-card">
      <div class="preview-number">Question ${index + 1} of ${cards.length} · ${card.Topic}</div>
      <h1>${card.Question}</h1>
      <section class="answer">
        <h2>Short answer</h2><div class="short">${card.Short}</div>
        <details><summary>Long answer</summary><div>${card.Long}</div></details>
        ${card.Readings ? `<details><summary>Formula pronunciation</summary><div class="readings">${card.Readings}</div></details>` : ""}
      </section>
    </article>`).join("");
  if (location.protocol === "https:" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
})();
