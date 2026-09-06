(() => {
  const data = CardStore.effectiveData();
  let total = 0;
  for (const [code, topic] of Object.entries(data.topics)) {
    const count = topic.cards.length;
    total += count;
    const node = document.querySelector(`[data-count="${code}"]`);
    if (node) node.textContent = count;
  }
  document.querySelector('[data-count="all"]').textContent = total;
  document.getElementById("totalCount").textContent = `${total} questions`;
})();
