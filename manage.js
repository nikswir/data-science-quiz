(() => {
  const activePanel = document.getElementById("activePanel");
  const trashPanel = document.getElementById("trashPanel");
  const trashList = document.getElementById("trashList");
  const toast = document.getElementById("toast");
  const escape = value => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const notify = message => { toast.textContent = message; toast.classList.add("visible"); setTimeout(() => toast.classList.remove("visible"), 1800); };

  function cardRow(card, trashed = false) {
    const edited = CardStore.isEdited(card.ID) ? '<span class="edited-badge">Edited</span>' : "";
    const custom = CardStore.isCustom(card.ID) ? '<span class="edited-badge custom-badge">Custom</span>' : "";
    return `<article class="library-card" data-id="${escape(card.ID)}"><div><small>${escape(card.Topic)}</small><strong>${escape(card.Question)}</strong><div>${edited}${custom}</div></div><div class="row-actions">${trashed ? '<button data-action="restore">Restore</button>' : `<a href="edit.html?id=${encodeURIComponent(card.ID)}">Edit</a><button class="danger" data-action="trash">Trash</button>`}</div></article>`;
  }

  function render() {
    const data = CardStore.effectiveData();
    const sections = Object.entries(data.topics).map(([code, topic]) => {
      if (!topic.cards.length) return "";
      return `<section class="library-topic"><h2>Topic ${code} · ${escape(topic.title)}</h2>${topic.cards.map(card => cardRow(card)).join("")}</section>`;
    }).join("");
    const active = Object.values(data.topics).flatMap(topic => topic.cards);
    const trashed = CardStore.trashCards();
    activePanel.innerHTML = sections || '<p class="empty-note">No active cards.</p>';
    trashList.innerHTML = trashed.map(card => cardRow(card, true)).join("") || '<p class="empty-note">Trash is empty.</p>';
    document.getElementById("activeCount").textContent = active.length;
    document.getElementById("trashCount").textContent = trashed.length;
    document.getElementById("emptyTrash").disabled = !trashed.length;
  }

  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      document.querySelectorAll(".tab").forEach(node => node.classList.toggle("active", node === tab));
      const showTrash = tab.dataset.tab === "trash";
      activePanel.hidden = showTrash; trashPanel.hidden = !showTrash;
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const id = action.closest("[data-id]").dataset.id;
    if (action.dataset.action === "trash") { CardStore.trash(id); notify("Moved to trash"); }
    if (action.dataset.action === "restore") { CardStore.restore(id); notify("Card restored"); }
    render();
  });
  document.getElementById("emptyTrash").addEventListener("click", () => {
    if (!confirm("Permanently remove every card currently in the trash from this device?")) return;
    CardStore.emptyTrash(); render(); notify("Trash emptied");
  });
  document.getElementById("resetProgress").addEventListener("click", () => {
    if (!confirm("Reset the green, red, and gray progress for every topic?")) return;
    CardStore.resetProgress(); notify("Progress reset");
  });
  document.getElementById("exportData").addEventListener("click", async () => {
    const file = new File([CardStore.backup()], `data-science-quiz-${new Date().toISOString().slice(0,10)}.json`, {type:"application/json"});
    if (navigator.canShare?.({files:[file]})) { await navigator.share({files:[file], title:"Quiz backup"}).catch(() => {}); return; }
    const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = file.name; link.click(); URL.revokeObjectURL(link.href);
  });
  document.getElementById("importData").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    try { CardStore.importBackup(await file.text()); render(); notify("Backup imported"); }
    catch (_) { alert("This file is not a valid quiz backup."); }
    event.target.value = "";
  });
  render();
})();
