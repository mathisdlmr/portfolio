(function () {
  "use strict";
  const STORAGE_KEY = "mdlmr-lang";
  const PAGES = ["desktop", "about", "k3s", "path", "path-asso", "stack", "contact"];
  const OVERSCROLL = 260;   // px de défilement « dans le vide » avant de changer de fenêtre
  const QUIET_MS = 350;     // après un changement, il faut ce temps sans défilement avant d'en autoriser un autre
  let currentLang = "fr";
  let cur = 0, busy = false, quietT;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function T(key) { return DICT[currentLang][key] || DICT.fr[key] || key; }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){}
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(el => { el.textContent = T(el.getAttribute("data-i18n")); });
    $$(".lang-btn").forEach(btn => {
      const on = btn.getAttribute("data-set-lang") === lang;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on);
    });
    $$(".asso-toggle").forEach(btn => {
      const desc = btn.closest(".entry").querySelector(".asso-desc");
      const isOpen = desc && desc.classList.contains("open");
      btn.textContent = isOpen ? T("toggle_open") : T("toggle_closed");
    });
    setMenubar();
    tick();
  }

  function initLang() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s==="fr"||s==="en") currentLang=s; } catch(e){}
    setLang(currentLang);
  }

  /* ---------- Fenêtres ----------
     Chaque étape du défilement est une zone [data-page] ; plusieurs étapes peuvent
     vivre dans la même fenêtre (les canaux Slack) : on change alors de vue sans rouvrir. */

  const phone = matchMedia("(max-width: 760px)"); // même seuil que le CSS
  const scroller = i => $(`[data-page="${PAGES[i]}"]`);
  const win = i => scroller(i).closest(".window");

  function setMenubar() {
    $("#menubar-app").textContent = cur ? win(cur).dataset.app : T(phone.matches ? "menu_phone" : "menu_desktop");
  }

  // Verrou levé seulement quand le geste en cours s'arrête : l'inertie d'un trackpad
  // ne doit pas enchaîner plusieurs fenêtres.
  function settle() {
    clearTimeout(quietT);
    quietT = setTimeout(() => { busy = false; }, QUIET_MS);
  }

  function go(i, force) {
    if ((busy && !force) || i === cur || i < 0 || i >= PAGES.length) return;
    busy = true;
    settle();
    const prev = cur, back = i < prev;
    const prevWin = win(prev), nextWin = win(i);
    cur = i;
    if (prevWin !== nextWin) {
      if (prevWin) closeWin(prevWin);
      if (nextWin) openWin(nextWin);
    }
    showView(i, back); // après l'ouverture : une fenêtre masquée ignore scrollTop
    document.body.dataset.app = PAGES[i];
    $$("[data-open]").forEach(b => {
      const target = PAGES.indexOf(b.dataset.open);
      b.classList.toggle("running", target > 0 && win(target) === nextWin);
      b.classList.toggle("active", b.dataset.open === PAGES[i]);
    });
    history.replaceState(null, "", i ? "#" + PAGES[i] : location.pathname + location.search);
    setMenubar();
    setProgress(0);
  }

  // Affiche la vue i dans sa fenêtre (cache les autres vues de la même fenêtre).
  function showView(i, fromBelow) {
    const s = scroller(i), w = win(i);
    if (!w) return;
    $$("[data-page]", w).forEach(v => { v.hidden = v !== s; });
    s.scrollTop = fromBelow ? s.scrollHeight : 0;
    s.focus({ preventScroll: true });
  }

  function openWin(w) {
    // La fenêtre « sort » de son icône du dock.
    const icon = $$(".dock [data-open]").find(b => win(PAGES.indexOf(b.dataset.open)) === w);
    w.hidden = false;
    if (icon) {
      const r = w.getBoundingClientRect(), d = icon.getBoundingClientRect();
      w.style.transformOrigin = `${d.left + d.width / 2 - r.left}px ${d.top - r.top}px`;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add("open")));
  }

  function closeWin(w) {
    w.classList.remove("open");
    setTimeout(() => { if (!w.classList.contains("open")) w.hidden = true; }, 300);
  }

  /* ---------- Défilement en deux temps ----------
     1. on défile dans la fenêtre ouverte ;
     2. arrivé au bout, on continue : une jauge se remplit, puis la fenêtre suivante s'ouvre.
     Même logique vers le haut pour revenir à la précédente. */

  let acc = 0, resetT;

  function setProgress(p) {
    $$(".next").forEach(n => n.style.setProperty("--p", p));
  }

  function push(delta) {
    if ($("html.intro")) return;
    if (busy) { settle(); return; }
    const s = scroller(cur);
    const atEnd = s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
    const atTop = s.scrollTop <= 0;
    if ((delta > 0 && atEnd) || (delta < 0 && atTop)) acc += delta;
    else acc = 0;
    setProgress(Math.max(0, Math.min(1, acc / OVERSCROLL)));
    if (acc > OVERSCROLL) { acc = 0; go(cur + 1); }
    else if (acc < -OVERSCROLL) { acc = 0; go(cur - 1); }
    clearTimeout(resetT);
    resetT = setTimeout(() => { acc = 0; setProgress(0); }, 300);
  }

  function initScroll() {
    addEventListener("wheel", e => push(e.deltaY * (e.deltaMode === 1 ? 16 : 1)), { passive: true });
    let ty = null;
    addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
    addEventListener("touchmove", e => {
      if (ty === null) return;
      const y = e.touches[0].clientY;
      push((ty - y) * 1.5);
      ty = y;
    }, { passive: true });
    addEventListener("keydown", e => {
      if (e.key === "Escape") go(0, true);
    });
    document.addEventListener("click", e => {
      const opener = e.target.closest("[data-open]");
      if (opener) go(PAGES.indexOf(opener.dataset.open), true);
      else if (e.target.closest("[data-close]")) go(0, true);
    });
  }

  /* ---------- Intro : le portable s'ouvre, puis on zoome dans l'écran ---------- */

  function initIntro() {
    const root = document.documentElement, el = $("#intro");
    if (!root.classList.contains("intro")) { el.remove(); return; }
    try { sessionStorage.setItem("mdlmr-intro", "1"); } catch(e){}
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      el.classList.add("gone");
      root.classList.remove("intro");
      setTimeout(() => el.remove(), 450);
    };
    const zoom = () => {
      const scene = $(".scene", el), s = $(".screen", el).getBoundingClientRect(), r = scene.getBoundingClientRect();
      const k = Math.max(innerWidth / s.width, innerHeight / s.height) * 1.04;
      scene.style.transformOrigin = `${s.left - r.left + s.width / 2}px ${s.top - r.top + s.height / 2}px`;
      scene.style.transform = `translate(${innerWidth / 2 - (s.left + s.width / 2)}px, ${innerHeight / 2 - (s.top + s.height / 2)}px) scale(${k})`;
    };
    // Chaque étape attend la fin réelle de la précédente (une page lente ne doit pas zoomer sur un écran fermé).
    const scene = $(".scene", el);
    $(".lid", el).addEventListener("animationend", () => {
      el.classList.add("on");
      setTimeout(() => !ended && zoom(), 700);
    }, { once: true });
    scene.addEventListener("transitionend", end, { once: true });
    setTimeout(end, 7000); // filet de sécurité
    el.classList.add("play");
  }

  /* ---------- Horloge de la barre de menus ---------- */

  function tick() {
    const c = $("#clock");
    if (!c) return;
    const now = new Date();
    c.dateTime = now.toISOString();
    c.textContent = now.toLocaleString(currentLang, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- Contenus générés ---------- */

  function initAccordions() {
    $$(".asso-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const desc = btn.closest(".entry").querySelector(".asso-desc");
        const isOpen = desc.classList.toggle("open");
        btn.setAttribute("aria-expanded", isOpen);
        btn.textContent = isOpen ? T("toggle_open") : T("toggle_closed");
      });
    });
  }

  // `hl` : temps fort, affiché en réaction ★ sous le message.
  const ASSO_DATA = [
    {n:1, hl:true, tools:""},
    {n:2, hl:true, tools:"Laravel, TypeScript, Expo, Docker, CI/CD"},
    {n:3, tools:"Laravel, TypeScript, Expo, React Native"},
    {n:4, tools:"Laravel, React, Raspberry Pi, NFC"},
    {n:5, tools:""},
    {n:6, tools:""},
    {n:7, tools:"Laravel, Expo, React Native"},
    {n:8, tools:"Flutter, Laravel"}
  ];

  function buildAsso() {
    const list = $("#asso-list");
    if (!list) return;
    list.innerHTML = "";
    ASSO_DATA.forEach(a => {
      const tools = a.tools ? `<p><code>${a.tools}</code></p>` : "";
      const hl = a.hl ? `<span class="reaction"><span aria-hidden="true">⭐</span> 1<span class="visually-hidden" data-i18n="hl_label"></span></span>` : "";
      list.insertAdjacentHTML("beforeend",
        `<li class="msg entry" id="entry-asso${a.n}">
          <span class="avatar" aria-hidden="true">MD</span>
          <div class="msg-body">
            <p class="msg-meta"><b>Mathis Delmaere</b> <span data-i18n="asso${a.n}_period"></span></p>
            <p class="msg-role"><strong data-i18n="asso${a.n}_role"></strong></p>
            <p class="msg-org" data-i18n="asso${a.n}_org"></p>
            ${tools}
            <div class="asso-desc" id="asso-desc-${a.n}"><p data-i18n="asso${a.n}_desc"></p></div>
            <button class="asso-toggle" aria-expanded="false" aria-controls="asso-desc-${a.n}">${T("toggle_closed")}</button>
            ${hl}
          </div>
        </li>`
      );
    });
  }

  // [nom, slug simple-icons, couleur forcée si le logo est trop sombre sur fond noir]
  const STACK_GROUPS = [
    {title:"sg3", dir:"devops", items:[["Docker","docker"],["Kubernetes","kubernetes"],["Helm","helm","white"],["ArgoCD","argo"],["GitHub Actions","githubactions"],["GitLab CI","gitlab"],["Ansible","ansible"],["Cilium","cilium"],["HAProxy"],["Renovate","renovate"],["Terraform","terraform"]]},
    {title:"sg4", dir:"observability", items:[["Prometheus","prometheus"],["Grafana","grafana"],["Loki","grafana"],["Alloy","grafana"],["Tempo","grafana"],["Thanos","thanos"],["OpenTelemetry","opentelemetry","white"],["Elasticsearch","elasticsearch"],["Fluent Bit","fluentbit"]]},
    {title:"sg6", dir:"network", items:[["Cloudflare","cloudflare"],["Traefik","traefikproxy"],["cert-manager"],["Tailscale","tailscale","white"],["Infisical"],["Nginx","nginx"],["Apache","apache"]]},
    {title:"sg1", dir:"languages", items:[["Go","go"],["Python","python"],["Bash","gnubash"],["TypeScript","typescript"],["JavaScript","javascript"],["PHP","php"],["Java","openjdk","white"],["C","c"]]},
    {title:"sg2", dir:"frameworks", items:[["Laravel","laravel"],["React / React Native","react"],["Next.js","nextdotjs","white"],["Node.js","nodedotjs"],["Spring Boot","springboot"],["Expo","expo","white"],["Flutter","flutter"]]},
    {title:"sg5", dir:"databases", items:[["PostgreSQL","postgresql"],["MySQL","mysql"],["SQLite","sqlite","white"],["MongoDB","mongodb"]]}
  ];

  function buildStack() {
    const out = $("#stack-grid");
    if (!out) return;
    out.innerHTML = "";
    STACK_GROUPS.forEach(g => {
      const items = g.items.map(([name, slug, color]) => {
        const icon = slug
          ? `<img src="https://cdn.simpleicons.org/${slug}${color ? "/" + color : ""}" alt="" width="14" height="14" loading="lazy">`
          : `<i class="t-file" aria-hidden="true"></i>`;
        return `<li>${icon}${name}</li>`;
      }).join("");
      out.insertAdjacentHTML("beforeend",
        `<p><span class="t-prompt">mdlmr@homelab ~/stack %</span> eza --icons ${g.dir}/</p>
         <p class="t-cmt"># <span data-i18n="${g.title}"></span></p>
         <ul class="t-ls">${items}</ul>`);
    });
  }

  // Ping des nœuds du widget cluster : ponytail: valeurs simulées entre 10 et 20 ms, pas une mesure réelle.
  function ping() {
    $$("[data-ping]").forEach(el => { el.textContent = (10 + Math.floor(Math.random() * 11)) + " ms"; });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildAsso(); buildStack();
    initLang(); initAccordions(); initScroll(); initIntro();
    setInterval(tick, 30000);
    ping(); setInterval(ping, 2500);
    phone.addEventListener("change", setMenubar);
    $$(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => setLang(btn.getAttribute("data-set-lang")));
    });
    // Lien profond (#k3s, #path…) : ouvre directement la bonne fenêtre.
    const start = PAGES.indexOf(location.hash.slice(1));
    if (start > 0) go(start);
  });
})();
