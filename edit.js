(() => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const card = CardStore.find(id);
  if (!card) { location.replace("manage.html"); return; }
  let backUrl = params.get("return") || "manage.html";
  try {
    const target = new URL(backUrl, location.href);
    backUrl = target.origin === location.origin ? target.href : "manage.html";
  } catch (_) { backUrl = "manage.html"; }
  document.getElementById("backLink").href = backUrl;
  const fields = {
    Topic: document.getElementById("topicInput"), Question: document.getElementById("questionInput"),
    Short: document.getElementById("shortInput"), Long: document.getElementById("longInput"), Readings: document.getElementById("readingsInput"),
  };
  function fill(value) {
    fields.Topic.value = value.Topic; fields.Question.value = value.Question;
    fields.Short.innerHTML = value.Short; fields.Long.innerHTML = value.Long; fields.Readings.innerHTML = value.Readings;
  }
  const values = () => ({ Topic: fields.Topic.value, Question: fields.Question.value, Short: fields.Short.innerHTML, Long: fields.Long.innerHTML, Readings: fields.Readings.innerHTML });
  fill(card);

  let activeEditor = fields.Short;
  [fields.Short, fields.Long, fields.Readings].forEach(editor => editor.addEventListener("focus", () => activeEditor = editor));
  document.querySelectorAll("[data-command]").forEach(button => button.addEventListener("click", () => { activeEditor.focus(); document.execCommand(button.dataset.command); }));
  document.querySelectorAll("[data-block]").forEach(button => button.addEventListener("click", () => { activeEditor.focus(); document.execCommand("formatBlock", false, button.dataset.block); }));
  document.getElementById("insertSection").addEventListener("click", () => {
    activeEditor.focus(); document.execCommand("insertHTML", false, "<h3>New section</h3><p>Write the explanation here.</p>");
  });

  const editView = document.getElementById("editView");
  const previewView = document.getElementById("previewView");
  const toggle = document.getElementById("togglePreview");
  toggle.addEventListener("click", async () => {
    const opening = previewView.hidden;
    editView.hidden = opening; previewView.hidden = !opening;
    toggle.textContent = opening ? "Continue editing" : "Preview";
    if (!opening) return;
    const value = values();
    document.getElementById("previewTopic").textContent = value.Topic;
    document.getElementById("previewQuestion").textContent = value.Question;
    document.getElementById("previewShort").innerHTML = value.Short;
    document.getElementById("previewLong").innerHTML = value.Long;
    document.getElementById("previewReadings").innerHTML = value.Readings;
    if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([previewView]);
    window.scrollTo(0, 0);
  });
  document.getElementById("saveCard").addEventListener("click", () => {
    const value = values();
    if (!value.Question.trim() || !fields.Short.textContent.trim()) { alert("Question and short answer cannot be empty."); return; }
    CardStore.edit(id, value); location.href = backUrl;
  });
  document.getElementById("restoreOriginal").addEventListener("click", () => {
    if (!confirm("Discard your edits and restore the original card?")) return;
    CardStore.resetEdit(id); location.href = backUrl;
  });
})();
