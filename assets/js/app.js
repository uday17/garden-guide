/* ==========================================================================
   GrowWell — site behaviour
   Progressive enhancement: every feature degrades gracefully without JS.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- tiny storage helper ---------------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* private mode / quota — ignore */
      }
    }
  };

  const KEY_PLANTS = "growwell.savedPlants";
  const KEY_THEME = "growwell.theme";
  const KEY_TASKS = "growwell.tasks";
  const KEY_NOTES = "growwell.notes";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);

  /* ---------------- theme ---------------- */
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    $$(".theme-toggle").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(theme === "dark"));
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    });
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0f1512" : "#fbf8f1");
  }

  const storedTheme = store.get(KEY_THEME, null);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(storedTheme || (prefersDark ? "dark" : "light"));

  $$(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      store.set(KEY_THEME, next);
    });
  });

  /* ---------------- mobile navigation ---------------- */
  const nav = $("#siteNav");
  const navToggle = $("#navToggle");

  if (nav && navToggle) {
    const close = () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !navToggle.contains(e.target)) close();
    });
  }

  /* ---------------- sticky header + to-top ---------------- */
  const header = $("#siteHeader");
  const toTop = $("#toTop");

  const onScroll = () => {
    const y = window.scrollY || 0;
    if (header) header.classList.toggle("is-stuck", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------------- scroll reveal ---------------- */
  const reveals = $$(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      reveals.forEach((el) => io.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("is-in"));
    }
  }

  /* ---------------- tabs ---------------- */
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        select(next);
      });
    });
    const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    if (initial) select(initial);
  });

  /* ---------------- plant library ---------------- */
  const grid = $("#plantGrid");

  if (grid && window.PLANTS) {
    const search = $("#plantSearch");
    const difficulty = $("#difficultyFilter");
    const count = $("#resultCount");
    const chips = $$("[data-cat]");
    const whereChips = $$("[data-where]");
    const emptyState = $("#plantEmpty");
    let activeCat = "All";
    let activeWhere = "all";

    const difficultyLabel = (n) =>
      n === 1 ? "Easy" : n === 2 ? "Moderate" : "Demanding";

    const saved = () => store.get(KEY_PLANTS, []);
    const isSaved = (name) => saved().indexOf(name) !== -1;

    function card(p) {
      const dots = [1, 2, 3]
        .map((i) => `<i class="${i <= p.difficulty ? "on" : ""}"></i>`)
        .join("");
      const img = window.PLANT_IMAGES && window.PLANT_IMAGES[p.name];
      const photo = img
        ? `<div class="plant__photo">
             <img src="${esc(img.file)}" alt="${esc(p.name)} — ${esc(p.botanical)}"
                  loading="lazy" width="600" height="375"
                  title="Photo: ${esc(img.artist)} · ${esc(img.license)}">
             <span class="plant__glyph" aria-hidden="true">${p.glyph}</span>
             <a class="plant__credit" href="${esc(img.source)}" target="_blank" rel="noopener noreferrer"
                title="Photo: ${esc(img.artist)} — ${esc(img.license)}"
                aria-label="Image source and licence for ${esc(p.name)}">ⓘ</a>
           </div>`
        : "";

      return `
        <article class="plant" data-name="${esc(p.name.toLowerCase())}" style="--tint:${esc(p.tint)}">
          ${photo}
          <div class="plant__top">
            <div class="plant__title">
              <h3>${esc(p.name)}</h3>
              <p class="plant__bot">${esc(p.botanical)}</p>
            </div>
          </div>
          <div class="plant__body">
            <span class="pill pill--muted">${esc(p.category)}</span>
            <dl class="plant__specs">
              <div><dt>Light</dt><dd>${esc(p.light)}</dd></div>
              <div><dt>Water</dt><dd>${esc(p.water)}</dd></div>
              <div><dt>Height</dt><dd>${esc(p.height)}</dd></div>
              <div><dt>Level</dt><dd><span class="difficulty" data-level="${p.difficulty}" role="img"
                aria-label="${difficultyLabel(p.difficulty)}">${dots}</span>
                ${difficultyLabel(p.difficulty)}</dd></div>
            </dl>
            <details>
              <summary>Care note</summary>
              <p>${esc(p.tip)}</p>
            </details>
            <div class="plant__foot">
              <button class="save-btn" type="button" data-save="${esc(p.name)}"
                aria-pressed="${isSaved(p.name)}">
                ${isSaved(p.name) ? "✓ In my plan" : "+ Add to my plan"}
              </button>
            </div>
          </div>
        </article>`;
    }

    function render() {
      const q = (search && search.value ? search.value : "").trim().toLowerCase();
      const level = difficulty ? difficulty.value : "all";

      const list = window.PLANTS.filter((p) => {
        const inCat = activeCat === "All" || p.category === activeCat;
        const inLevel = level === "all" || String(p.difficulty) === level;
        const inWhere =
          activeWhere === "all" || p.where === activeWhere || p.where === "both";
        const hay = `${p.name} ${p.botanical} ${p.category} ${p.tip}`.toLowerCase();
        return inCat && inLevel && inWhere && (!q || hay.indexOf(q) !== -1);
      });

      grid.innerHTML = list.map(card).join("");
      if (count) count.textContent = `${list.length} of ${window.PLANTS.length} plants`;
      if (emptyState) emptyState.hidden = list.length !== 0;
      wireSaveButtons();
    }

    function wireSaveButtons() {
      $$("[data-save]", grid).forEach((btn) => {
        btn.addEventListener("click", () => {
          const name = btn.getAttribute("data-save");
          let list = saved();
          if (list.indexOf(name) === -1) {
            list.push(name);
            btn.textContent = "✓ In my plan";
            btn.setAttribute("aria-pressed", "true");
          } else {
            list = list.filter((n) => n !== name);
            btn.textContent = "+ Add to my plan";
            btn.setAttribute("aria-pressed", "false");
          }
          store.set(KEY_PLANTS, list);
        });
      });
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        activeCat = chip.getAttribute("data-cat");
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        render();
      });
    });

    whereChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        activeWhere = chip.getAttribute("data-where");
        whereChips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        render();
      });
    });

    if (search) {
      let t;
      search.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(render, 120);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement !== search) {
          e.preventDefault();
          search.focus();
        }
      });
    }
    if (difficulty) difficulty.addEventListener("change", render);

    render();
  }

  /* ---------------- planner ---------------- */
  const tasks = $$("[data-task]");
  if (tasks.length) {
    const savedTasks = store.get(KEY_TASKS, {});
    const bar = $("#taskProgress");
    const label = $("#taskProgressLabel");

    const update = () => {
      const done = tasks.filter((t) => t.checked).length;
      const pct = Math.round((done / tasks.length) * 100);
      if (bar) bar.style.width = pct + "%";
      if (label) label.textContent = `${done} of ${tasks.length} tasks done`;
    };

    tasks.forEach((t) => {
      t.checked = !!savedTasks[t.getAttribute("data-task")];
      t.addEventListener("change", () => {
        const state = {};
        tasks.forEach((x) => {
          state[x.getAttribute("data-task")] = x.checked;
        });
        store.set(KEY_TASKS, state);
        update();
      });
    });
    update();
  }

  const wishlist = $("#wishlist");
  if (wishlist) {
    const renderWishlist = () => {
      const names = store.get(KEY_PLANTS, []);
      if (!names.length) {
        wishlist.innerHTML =
          '<p class="muted small mb-0">Nothing saved yet. Browse the ' +
          '<a href="plants.html">plant library</a> and tap “Add to my plan”.</p>';
        return;
      }
      wishlist.innerHTML = names
        .map((name) => {
          const p = (window.PLANTS || []).find((x) => x.name === name);
          const img = window.PLANT_IMAGES && window.PLANT_IMAGES[name];
          return `<div class="wish">
            ${img ? `<img class="wish__thumb" src="${esc(img.file)}" alt="" loading="lazy">`
                  : `<span aria-hidden="true">${p ? p.glyph : "🌱"}</span>`}
            <b>${esc(name)}</b>
            <span class="muted small">${esc(p ? p.category : "")}</span>
            <button type="button" data-remove="${esc(name)}" aria-label="Remove ${esc(name)}">×</button>
          </div>`;
        })
        .join("");

      $$("[data-remove]", wishlist).forEach((btn) => {
        btn.addEventListener("click", () => {
          const name = btn.getAttribute("data-remove");
          store.set(
            KEY_PLANTS,
            store.get(KEY_PLANTS, []).filter((n) => n !== name)
          );
          renderWishlist();
        });
      });
    };
    renderWishlist();
  }

  const notes = $("#gardenNotes");
  if (notes) {
    notes.value = store.get(KEY_NOTES, "");
    let nt;
    notes.addEventListener("input", () => {
      clearTimeout(nt);
      nt = setTimeout(() => store.set(KEY_NOTES, notes.value), 400);
    });
    const clear = $("#clearNotes");
    if (clear) {
      clear.addEventListener("click", () => {
        if (!window.confirm("Clear your saved notes? This cannot be undone.")) return;
        notes.value = "";
        store.set(KEY_NOTES, "");
      });
    }
  }

  /* ---------------- footer year ---------------- */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
