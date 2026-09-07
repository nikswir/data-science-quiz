(() => {
  const config = window.SUPABASE_CONFIG || {};
  const available = Boolean(window.supabase?.createClient && config.url && config.publishableKey);
  const client = available ? window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  let user = null;
  let status = available ? "signed-out" : "offline";
  let timer = null;
  let pushing = false;
  let queued = false;

  function announce(message = "") {
    window.dispatchEvent(new CustomEvent("cloudsyncstatus", { detail: { status, message, user } }));
  }
  const metaKey = id => `data-science-quiz-cloud-meta:${id}`;
  const asTime = value => value ? Date.parse(value) || 0 : 0;

  async function pushNow() {
    if (!client || !user) return false;
    if (pushing) { queued = true; return false; }
    pushing = true; status = "syncing"; announce();
    const state = CardStore.load();
    if (!state.updatedAt) state.updatedAt = new Date().toISOString();
    const { error } = await client.from("quiz_state").upsert({ user_id: user.id, payload: state, updated_at: state.updatedAt });
    pushing = false;
    if (error) {
      status = "error"; announce(error.message);
      if (queued) { queued = false; schedulePush(); }
      return false;
    }
    localStorage.setItem(metaKey(user.id), state.updatedAt);
    status = "synced"; announce();
    if (queued) { queued = false; schedulePush(); }
    return true;
  }

  function schedulePush() {
    if (!user) return;
    clearTimeout(timer); timer = setTimeout(pushNow, 700);
  }

  async function reconcile(session) {
    user = session?.user || null;
    if (!user) { status = available ? "signed-out" : "offline"; announce(); return; }
    status = "syncing"; announce();
    const { data, error } = await client.from("quiz_state").select("payload,updated_at").eq("user_id", user.id).maybeSingle();
    if (error) { status = "error"; announce(error.message); return; }
    const local = CardStore.load();
    if (!data) { await pushNow(); return; }
    const lastSynced = asTime(localStorage.getItem(metaKey(user.id)));
    const localTime = asTime(local.updatedAt);
    const remoteTime = asTime(data.updated_at || data.payload?.updatedAt);
    if (lastSynced && localTime > lastSynced && localTime > remoteTime) {
      await pushNow(); return;
    }
    CardStore.replaceState(data.payload);
    localStorage.setItem(metaKey(user.id), data.updated_at || data.payload?.updatedAt || new Date().toISOString());
    status = "synced"; announce();
  }

  const ready = (async () => {
    if (!client) { announce("Cloud library unavailable; using this device."); return; }
    const { data } = await client.auth.getSession();
    await reconcile(data.session);
    client.auth.onAuthStateChange((_event, session) => setTimeout(() => reconcile(session), 0));
  })();

  window.addEventListener("cardstorechange", schedulePush);
  window.addEventListener("online", () => { if (user) reconcile({ user }); });
  window.CloudSync = {
    ready, client,
    get user() { return user; }, get status() { return status; },
    async signIn(email) {
      if (!client) throw new Error("Cloud sign-in is unavailable.");
      const redirect = config.authRedirectUrl || new URL("manage.html", location.href).href;
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
      if (error) throw error;
    },
    async signOut() { if (client) await client.auth.signOut(); },
    syncNow: () => user ? reconcile({ user }) : Promise.resolve(false),
  };
})();
