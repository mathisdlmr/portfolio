(function () {
  "use strict";
  const STORAGE_KEY = "mdlmr-lang";
  const RACK_UNIT = 44; // 1U, en px : toute la page se cale sur ce pas
  let currentLang = "fr";

  function T(key) { return DICT[currentLang][key] || DICT.fr[key] || key; }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){}
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = T(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll(".lang-btn").forEach(btn => {
      const on = btn.getAttribute("data-set-lang") === lang;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on);
    });
    document.querySelectorAll(".asso-toggle").forEach(btn => {
      const desc = btn.closest(".entry").querySelector(".asso-desc");
      const isOpen = desc && desc.classList.contains("open");
      btn.textContent = isOpen ? T("toggle_open") : T("toggle_closed");
    });
    mountDevices();
  }

  function initLang() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s==="fr"||s==="en") currentLang=s; } catch(e){}
    setLang(currentLang);
  }

  // Chaque équipement occupe un nombre entier d'unités de baie :
  // on arrondit sa hauteur au U supérieur et on l'écrit sur l'oreille.
  function mountDevices() {
    document.querySelectorAll(".device").forEach(dev => {
      dev.style.minHeight = "";
      const u = Math.max(1, Math.ceil(dev.offsetHeight / RACK_UNIT));
      dev.style.minHeight = (u * RACK_UNIT) + "px";
      dev.setAttribute("data-u", u + "U");
    });
  }

  function initRack() {
    let t;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(mountDevices, 100); });
    if (document.fonts) document.fonts.ready.then(mountDevices);
    window.addEventListener("load", mountDevices);
  }

  // Panneau de brassage : le port de la section en cours est « branché ».
  function initPatchPanel() {
    const ports = [...document.querySelectorAll(".port")];
    if (!ports.length) return;
    let ticking = false;
    function update() {
      const probe = window.scrollY + window.innerHeight * 0.35;
      let current = null;
      ports.forEach(p => {
        const section = document.querySelector(p.getAttribute("href"));
        if (section && section.offsetTop <= probe) current = p;
      });
      ports.forEach(p => {
        if (p === current) p.setAttribute("aria-current", "location");
        else p.removeAttribute("aria-current");
      });
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function initAccordions() {
    document.querySelectorAll(".asso-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const desc = btn.closest(".entry").querySelector(".asso-desc");
        const isOpen = desc.classList.toggle("open");
        btn.setAttribute("aria-expanded", isOpen);
        btn.textContent = isOpen ? T("toggle_open") : T("toggle_closed");
        mountDevices();
      });
    });
  }

  // `tape` : ce qui est écrit sur l'étiquette du tiroir ; `hl` : LED allumée (temps fort).
  const ASSO_DATA = [
    {n:1, tape:"pic'asso", hl:true, tools:""},
    {n:2, tape:"ski'ut", hl:true, tools:"Laravel, TypeScript, Expo, Docker, CI/CD"},
    {n:3, tape:"ski'utc", tools:"Laravel, TypeScript, Expo, React Native"},
    {n:4, tape:"pic'asso", tools:"Laravel, React, Raspberry Pi, NFC"},
    {n:5, tape:"pic'asso", tools:""},
    {n:6, tape:"compiègne en lumière", tools:""},
    {n:7, tape:"integ", tools:"Laravel, Expo, React Native"},
    {n:8, tape:"integ fév", tools:"Flutter, Laravel"}
  ];

  function buildAsso() {
    const list = document.getElementById("asso-list");
    if (!list) return;
    list.innerHTML = "";
    ASSO_DATA.forEach(a => {
      const tools = a.tools ? `<p class="tools-line">${a.tools}</p>` : "";
      const led = a.hl ? `<span class="led led--on" style="--i:${6 + a.n}" aria-hidden="true"></span>` : `<span class="led" aria-hidden="true"></span>`;
      list.insertAdjacentHTML("beforeend",
        `<li class="entry" id="entry-asso${a.n}">
          <span class="handle" aria-hidden="true"></span>
          <div class="sled-body">
            <p class="sled-top"><span class="tape tape--sm">${a.tape}</span><span class="period" data-i18n="asso${a.n}_period"></span>${led}</p>
            <h4 class="role" data-i18n="asso${a.n}_role"></h4>
            <p class="org" data-i18n="asso${a.n}_org"></p>
            ${tools}
            <div class="asso-desc" id="asso-desc-${a.n}"><p class="desc" data-i18n="asso${a.n}_desc"></p></div>
            <button class="asso-toggle" aria-expanded="false" aria-controls="asso-desc-${a.n}">${T("toggle_closed")}</button>
          </div>
        </li>`
      );
    });
  }

  const STACK_GROUPS = [
    {title:"sg3", items:["Docker","Kubernetes","Helm","ArgoCD","GitHub Actions","GitLab CI","Ansible","Cilium","HAProxy","Renovate","Terraform"]},
    {title:"sg4", items:["Prometheus","Grafana","Loki","Alloy","Tempo","Thanos","OpenTelemetry","Elasticsearch","Fluent Bit"]},
    {title:"sg6", items:["Cloudflare","Traefik","cert-manager","Tailscale","Infisical","Nginx","Apache"]},
    {title:"sg1", items:["Go","Python","Bash","TypeScript","JavaScript","PHP","Java","C"]},
    {title:"sg2", items:["Laravel","React / React Native","Next.js","Node.js","Spring Boot","Expo","Flutter"]},
    {title:"sg5", items:["PostgreSQL","MySQL","SQLite","MongoDB"]}
  ];

  function buildStack() {
    const body = document.getElementById("stack-grid");
    if (!body) return;
    body.innerHTML = "";
    STACK_GROUPS.forEach(g => {
      const items = g.items.map(name => `<li>${name}</li>`).join("");
      body.insertAdjacentHTML("beforeend",
        `<tr><th scope="row" data-i18n="${g.title}"></th><td><ul>${items}</ul></td></tr>`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildAsso(); buildStack();
    initLang(); initAccordions(); initRack(); initPatchPanel();
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => setLang(btn.getAttribute("data-set-lang")));
    });
  });
})();
