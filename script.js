(function () {
  "use strict";
  const STORAGE_KEY = "mdlmr-lang";
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
      btn.classList.toggle("active", btn.getAttribute("data-set-lang") === lang);
    });
    document.querySelectorAll(".asso-toggle").forEach(btn => {
      const desc = btn.closest(".exp-card").querySelector(".asso-desc");
      const isOpen = desc && desc.classList.contains("open");
      btn.querySelector(".toggle-text").textContent = isOpen ? T("toggle_open") : T("toggle_closed");
    });
  }

  function initLang() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s==="fr"||s==="en") currentLang=s; } catch(e){}
    setLang(currentLang);
  }

  function initNav() {
    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle||!nav) return;
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => e.target.classList.toggle("visible", e.isIntersecting));
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => obs.observe(el));
  }

  function initTerminal() {
    const body = document.getElementById("terminal-body");
    if (!body) return;
    const rows = [
      [{t:"$ ",c:"t-prompt"},{t:"tailscale status",c:"t-cmd"}],
      [{t:"100.64.0.1   ",c:"t-output"},{t:"nuc-01",c:"t-blue"},{t:"   linux   idle",c:"t-dim"}],
      [{t:"100.64.0.2   ",c:"t-output"},{t:"nuc-02",c:"t-blue"},{t:"   linux   idle",c:"t-dim"}],
      [{t:"100.64.0.3   ",c:"t-output"},{t:"nuc-03",c:"t-blue"},{t:"   linux   idle",c:"t-dim"}],
      [{t:" ",c:"t-output"}],
      [{t:"$ ",c:"t-prompt"},{t:"argocd app list -o name",c:"t-cmd"}],
      [{t:"cloudflared         ",c:"t-blue"},{t:"fluent-operator          ",c:"t-blue"},{t:"longhorn",c:"t-blue"}],
      [{t:"traefik             ",c:"t-blue"},{t:"loki                     ",c:"t-blue"},{t:"skiut",c:"t-blue"}],
      [{t:"cert-manager        ",c:"t-blue"},{t:"alloy                    ",c:"t-blue"},{t:"affine",c:"t-blue"}],
      [{t:"external-secrets    ",c:"t-blue"},{t:"tempo",c:"t-blue"}],
      [{t:"eck-operator        ",c:"t-blue"},{t:"kube-prometheus-stack",c:"t-blue"}],
      [{t:" ",c:"t-output"}],
      [{t:"$ ",c:"t-prompt"},{t:"kubectl top pods -n skiut | tail -1",c:"t-cmd"}],
      [{t:"skiut-backend   142m   ",c:"t-output"},{t:"~150 req/s",c:"t-orange"},{t:" · peak ",c:"t-output"},{t:"200",c:"t-orange"}],
      [{t:" ",c:"t-output"}]
    ];
    const total = rows.reduce((n,r) => n+r.reduce((m,s) => m+s.t.length,0),0);
    let chars=0, typing=false, iv;

    function render() {
      body.innerHTML="";
      let budget=chars;
      for(let i=0;i<rows.length;i++){
        if(budget<=0&&i>0)break;
        const line=document.createElement("div"); line.className="terminal-line";
        for(const seg of rows[i]){
          if(budget<=0)break;
          const span=document.createElement("span"); span.className=seg.c;
          const len=Math.min(seg.t.length,budget);
          span.textContent=seg.t.slice(0,len); line.appendChild(span); budget-=len;
        }
        body.appendChild(line);
        if(budget<=0)break;
      }
      const cur=document.createElement("div"); cur.className="terminal-line";
      cur.innerHTML='<span class="t-prompt">$ </span><span class="t-cursor">▊</span>';
      body.appendChild(cur);
    }
    render();
    const obs = new IntersectionObserver(entries => {
      if(entries[0].isIntersecting && !typing){
        typing=true;
        iv=setInterval(()=>{chars++;if(chars>=total){clearInterval(iv);chars=total;}render();},40);
      }
    },{threshold:0.1});
    obs.observe(body);
  }

  function initAccordions() {
    document.querySelectorAll(".asso-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const card=btn.closest(".exp-card"), desc=card.querySelector(".asso-desc"),
              chevron=btn.querySelector(".asso-chevron"), textEl=btn.querySelector(".toggle-text");
        const isOpen=desc.classList.toggle("open");
        if(chevron) chevron.classList.toggle("open",isOpen);
        if(textEl) textEl.textContent = isOpen ? T("toggle_open") : T("toggle_closed");
      });
    });
  }

  const ASSO_DATA = [
    {n:1,hl:true,tags:[["i18n:tag_mgmt","#f0883e"],["i18n:tag_25pers","#f0883e"],["i18n:tag_projmgmt","#2fe62c"],["i18n:tag_rigor","#c2d1e7"]]},
    {n:2,hl:true,tags:[["Laravel","#ff2d20"],["TypeScript","#3178c6"],["Expo","#4d9fff"],["Docker","#2496ed"],["CI/CD","#3fb950"],["Self-Hosted","#3fb950"]]},
    {n:3,hl:false,tags:[["Laravel","#ff2d20"],["TypeScript","#3178c6"],["Expo","#4d9fff"],["React Native","#61dafb"]]},
    {n:4,hl:false,tags:[["i18n:tag_projmgmt","#2fe62c"],["Laravel","#ff2d20"],["React","#61dafb"],["Raspberry Pi","#c51a4a"],["NFC","#8b96a5"]]},
    {n:5,hl:false,tags:[["i18n:tag_autonomy","#22b631"],["i18n:tag_negotiation","#f0883e"],["i18n:tag_rigor","#c2d1e7"]]},
    {n:6,hl:false,tags:[["i18n:tag_communication","#4d9fff"],["i18n:tag_planning","#ffffff"],["i18n:tag_mgmt","#f0883e"],["i18n:tag_events","#31acff"]]},
    {n:7,hl:false,tags:[["Laravel","#ff2d20"],["Expo","#4d9fff"],["React Native","#61dafb"]]},
    {n:8,hl:false,tags:[["Flutter","#47c5fb"],["Laravel","#ff2d20"]]}
  ];

  function buildAsso() {
    const container = document.getElementById("asso-list");
    if (!container) return;
    container.innerHTML = "";
    ASSO_DATA.forEach(a => {
      const cls = a.hl ? "exp-card exp-card--highlight" : "exp-card exp-card--normal";
      const starSvg = a.hl ? '<span class="star-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="var(--accent-orange)"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z"></path></svg></span>' : '';
      const tagsHtml = a.tags.map(([name,color]) => {
        const label = name.startsWith("i18n:")
          ? `<span data-i18n="${name.slice(5)}"></span>`
          : name;
        return `<span class="exp-tag"><span class="exp-tag-dot" style="background:${color}"></span>${label}</span>`;
      }).join("");
      container.insertAdjacentHTML("beforeend",
        `<div class="${cls}">
          <div class="exp-card-header">
            <div class="exp-card-role-wrap"><span class="exp-card-role" data-i18n="asso${a.n}_role"></span>${starSvg}</div>
            <span class="exp-card-period" data-i18n="asso${a.n}_period"></span>
          </div>
          <div class="exp-card-org exp-card-org--asso" data-i18n="asso${a.n}_org"></div>
          <div class="exp-card-tags">${tagsHtml}</div>
          <div class="asso-desc"><p class="exp-card-desc" data-i18n="asso${a.n}_desc"></p></div>
          <button class="asso-toggle"><span class="toggle-text">${T("toggle_closed")}</span>
            <svg class="asso-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
          </button>
        </div>`
      );
    });
  }

  const SI = (slug) => slug ? `https://cdn.simpleicons.org/${slug}` : "";
  const STACK_GROUPS = [
    {title:"sg1",color:"#4d9fff",icon:"M16 18l6-6-6-6M8 6l-6 6 6 6",items:[
      ["Python","python"],["PHP","php"],["JavaScript","javascript"],["TypeScript","typescript"],
      ["Go","go"],["Bash","gnubash"],["Java","openjdk"],["C","c"]]},
    {title:"sg2",color:"#3fb950",icon:"M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",items:[
      ["React / RN","react"],["Next.js","nextdotjs"],["Laravel","laravel"],["Node.js","nodedotjs"],
      ["Spring Boot","springboot"],["Expo","expo"],["Flutter","flutter"]]},
    {title:"sg3",color:"#f0883e",icon:"M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8zM3.3 7 12 12l8.7-5M12 22V12",items:[
      ["Docker","docker"],["Kubernetes","kubernetes"],["Helm","helm"],["ArgoCD","argo"],
      ["GitHub Actions","githubactions"],["GitLab CI","gitlab"],["Terraform","terraform"],
      ["Cilium","cilium"],["HAProxy","", "#006ba7"],["Renovate","renovate"]]},
    {title:"sg4",color:"#4d9fff",icon:"M22 12h-4l-3 9L9 3l-3 9H2",items:[
      ["Prometheus","prometheus"],["Grafana","grafana"],["Loki","grafana"],["Alloy","grafana"],
      ["Tempo","grafana"],["Thanos","", "#6D41FF"],["OpenTelemetry","opentelemetry"]]},
    {title:"sg5",color:"#3fb950",icon:"M4 5c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3zM4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3",items:[
      ["PostgreSQL","postgresql"],["MySQL","mysql"],["SQLite","sqlite"],["MongoDB","mongodb"]]},
    {title:"sg6",color:"#f0883e",icon:"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",items:[
      ["Cloudflare","cloudflare"],["Traefik","traefikproxy"],["Nginx","nginx"],["Apache","apache"],
      ["cert-manager","", "#005fee"],["Tailscale","tailscale"]]}
  ];

  function buildStack() {
    const grid = document.getElementById("stack-grid");
    if (!grid) return;
    grid.innerHTML = "";
    STACK_GROUPS.forEach(g => {
      const itemsHtml = g.items.map(([name, slug, altColor]) => {
        const icon = slug
          ? `<img src="${SI(slug)}" alt="" width="15" height="15" loading="lazy" style="display:block;flex:none">`
          : `<span class="stack-item-dot" style="background:${altColor || g.color}"></span>`;
        return `<span class="stack-item">${icon}${name}</span>`;
      }).join("");
      grid.insertAdjacentHTML("beforeend",
        `<div class="stack-group">
          <div class="stack-group-header">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${g.color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${g.icon}"></path></svg>
            <span class="stack-group-title" data-i18n="${g.title}"></span>
          </div>
          <div class="stack-items">${itemsHtml}</div>
        </div>`
      );
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildAsso(); buildStack();
    initLang(); initNav(); initReveal(); initTerminal(); initAccordions();
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => setLang(btn.getAttribute("data-set-lang")));
    });
  });
})();
