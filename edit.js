(async () => {
  await CloudSync.ready;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const isNew = params.get("new") === "1";
  const language = !isNew && params.get("lang") === "ru" ? "ru" : "en";
  const russian = language === "ru";
  const suffix = russian ? "Ru" : "";
  const id = params.get("id");
  const emptyCard = { Topic: "7 · Custom card", Question: "", Short: "<p></p>", Long: "<p></p>", Readings: "" };
  const card = isNew ? emptyCard : CardStore.find(id);
  if (!card) { location.replace("manage.html"); return; }

  let backUrl = params.get("return") || "manage.html";
  try {
    const target = new URL(backUrl, location.href);
    backUrl = target.origin === location.origin ? target.href : "manage.html";
  } catch (_) { backUrl = "manage.html"; }
  $("backLink").href = backUrl;

  const deckInput = $("deckInput");
  for (const [code, topic] of Object.entries(QUIZ_DATA.topics)) {
    const option = document.createElement("option");
    option.value = code; option.textContent = `Topic ${code} · ${topic.title}`; deckInput.append(option);
  }
  deckInput.value = params.get("topic") && QUIZ_DATA.topics[params.get("topic")] ? params.get("topic") : "07";
  $("deckField").hidden = !isNew;
  $("dangerZone").hidden = isNew;
  $("editorTitle").textContent = isNew ? "Add card" : (russian ? "Редактировать русскую сторону" : "Edit English side");
  $("saveCard").textContent = isNew ? "Add card" : (russian ? "Сохранить перевод" : "Save English side");
  $("restoreOriginal").hidden = isNew;
  $("restoreOriginal").textContent = russian ? "Очистить русскую сторону" : "Restore English original";
  document.documentElement.lang = russian ? "ru" : "en";

  if (russian) {
    $("topicLabel").textContent = "Тема";
    $("questionLabel").textContent = "Вопрос";
    $("shortEditorLabel").textContent = "Короткий ответ";
    $("longEditorLabel").textContent = "Подробный ответ";
    $("readingsEditorLabel").textContent = "Произношение формул";
    $("editorHint").innerHTML = "Формулы отображаются через LaTeX. Не меняйте текст между <code>\\(</code> и <code>\\)</code>, если сама формула должна остаться прежней.";
  }

  const fields = {
    Topic: $("topicInput"), Question: $("questionInput"), Short: $("shortInput"),
    Long: $("longInput"), Readings: $("readingsInput"),
  };
  const sourceKey = name => name + suffix;
  function fill(value) {
    fields.Topic.value = value[sourceKey("Topic")] || "";
    fields.Question.value = value[sourceKey("Question")] || "";
    fields.Short.innerHTML = value[sourceKey("Short")] || "";
    fields.Long.innerHTML = value[sourceKey("Long")] || "";
    fields.Readings.innerHTML = value[sourceKey("Readings")] || "";
    if (russian) {
      fields.Topic.placeholder = value.Topic || "Название темы на русском (необязательно)";
      fields.Question.placeholder = "Введите вопрос на русском";
    }
  }
  const values = () => ({
    [sourceKey("Topic")]: fields.Topic.value,
    [sourceKey("Question")]: fields.Question.value,
    [sourceKey("Short")]: fields.Short.innerHTML,
    [sourceKey("Long")]: fields.Long.innerHTML,
    [sourceKey("Readings")]: fields.Readings.innerHTML,
  });
  fill(card);
  deckInput.addEventListener("change", () => {
    if (/^\d+ · Custom card$/.test(fields.Topic.value)) fields.Topic.value = `${Number(deckInput.value)} · Custom card`;
  });

  let activeEditor = fields.Short;
  [fields.Short, fields.Long, fields.Readings].forEach(editor => editor.addEventListener("focus", () => activeEditor = editor));
  document.querySelectorAll("[data-command]").forEach(button => button.addEventListener("click", () => { activeEditor.focus(); document.execCommand(button.dataset.command); }));
  document.querySelectorAll("[data-block]").forEach(button => button.addEventListener("click", () => { activeEditor.focus(); document.execCommand("formatBlock", false, button.dataset.block); }));
  $("insertSection").addEventListener("click", () => {
    activeEditor.focus();
    document.execCommand("insertHTML", false, russian ? "<h3>Новый раздел</h3><p>Добавьте объяснение.</p>" : "<h3>New section</h3><p>Write the explanation here.</p>");
  });

  const editView = $("editView");
  const previewView = $("previewView");
  const toggle = $("togglePreview");
  toggle.textContent = russian ? "Предпросмотр" : "Preview";
  toggle.addEventListener("click", async () => {
    const opening = previewView.hidden;
    editView.hidden = opening; previewView.hidden = !opening;
    toggle.textContent = opening ? (russian ? "Продолжить редактирование" : "Continue editing") : (russian ? "Предпросмотр" : "Preview");
    if (!opening) return;
    const value = values();
    $("previewTopic").textContent = value[sourceKey("Topic")];
    $("previewQuestion").textContent = value[sourceKey("Question")];
    $("previewShort").innerHTML = value[sourceKey("Short")];
    $("previewLong").innerHTML = value[sourceKey("Long")];
    $("previewReadings").innerHTML = value[sourceKey("Readings")];
    if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([previewView]);
    window.scrollTo(0, 0);
  });

  function returnToPreviousPage() {
    const target = new URL(backUrl, location.href);
    target.searchParams.set("saved", Date.now().toString());
    location.replace(target.href);
  }

  $("saveCard").addEventListener("click", async () => {
    const value = values();
    if (!fields.Question.value.trim() || !fields.Short.textContent.trim()) {
      alert(russian ? "Заполните вопрос и короткий ответ." : "Question and short answer cannot be empty.");
      return;
    }
    const button = $("saveCard");
    button.disabled = true;
    button.textContent = russian ? "Сохраняю…" : "Saving…";
    try {
      if (isNew) CardStore.create(deckInput.value, value);
      else CardStore.edit(id, value);
      const synced = await CloudSync.flush();
      if (CloudSync.user && !synced) {
        alert(russian ? "Изменение сохранено на этом устройстве, но синхронизация не удалась. Проверьте соединение и повторите Sync." : "Saved on this device, but cloud sync failed. Check the connection and run Sync again.");
      }
      returnToPreviousPage();
    } catch (error) {
      alert(error.message || (russian ? "Не удалось сохранить карточку." : "Could not save the card."));
      button.disabled = false;
      button.textContent = isNew ? "Add card" : (russian ? "Сохранить перевод" : "Save English side");
    }
  });
  $("restoreOriginal").addEventListener("click", () => {
    const message = russian ? "Очистить русский перевод этой карточки? Английская сторона останется без изменений." : "Discard your English edits and restore the original English card?";
    if (!confirm(message)) return;
    CardStore.resetFields(id, [sourceKey("Topic"), sourceKey("Question"), sourceKey("Short"), sourceKey("Long"), sourceKey("Readings")]);
    location.href = backUrl;
  });
  $("deleteCard").addEventListener("click", () => {
    CardStore.trash(id);
    location.href = backUrl;
  });
})();
