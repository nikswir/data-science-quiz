(async () => {
  await CloudSync.ready;
  function ringFor(cards) {
    const value = CardStore.progress(cards);
    const correct = value.total ? value.correct / value.total * 360 : 0;
    const wrong = value.total ? value.wrong / value.total * 360 : 0;
    const ring = document.createElement("span");
    ring.className = "progress-ring";
    ring.style.setProperty("--correct-angle", `${correct}deg`);
    ring.style.setProperty("--wrong-angle", `${correct + wrong}deg`);
    ring.title = `${value.correct} answered · ${value.wrong} didn’t answer · ${value.unseen} not attempted`;
    ring.setAttribute("aria-label", ring.title);
    return ring;
  }

  function renderProgress() {
    const data = CardStore.effectiveData();
    let total = 0;
    const allCards = [];
    for (const [code, topic] of Object.entries(data.topics)) {
      const count = topic.cards.length;
      total += count; allCards.push(...topic.cards);
      const node = document.querySelector(`[data-count="${code}"]`);
      if (node) {
        node.parentElement.querySelector(".progress-ring")?.remove();
        node.textContent = count;
        node.before(ringFor(topic.cards));
      }
    }
    const allCount = document.querySelector('[data-count="all"]');
    allCount.parentElement.querySelector(".progress-ring")?.remove();
    allCount.textContent = total;
    allCount.before(ringFor(allCards));
    document.getElementById("totalCount").textContent = `${total} questions`;
  }

  window.addEventListener("pageshow", renderProgress);
  window.addEventListener("cardstorechange", renderProgress);
  window.addEventListener("cardstoreloaded", renderProgress);
  window.addEventListener("cloudsyncstatus", event => {
    if (event.detail.status === "synced") renderProgress();
  });
  renderProgress();
})();
