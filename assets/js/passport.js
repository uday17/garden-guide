/* ==========================================================================
   Gardening — Plant Passport
   Each plant is remembered with the student who brought it.
   Entries are stored privately in the browser (localStorage).
   ========================================================================== */
(function () {
  "use strict";

  const KEY = "gardening-plant-passports-v1";
  const $ = (sel) => document.querySelector(sel);
  const xmlns = "http://www.w3.org/2000/svg";

  const els = {
    grid: $("#passportGrid"),
    form: $("#passportForm"),
    search: $("#passportSearch"),
    count: $("#passportCount"),
    statPlants: $("#statPlants"),
    statStudents: $("#statStudents"),
    statEntries: $("#statEntries"),
    hint: $("#passportHint"),
    student: $("#ppStudent"),
    plant: $("#ppPlant"),
    species: $("#ppSpecies"),
    date: $("#ppDate"),
    note: $("#ppNote"),
    photo: $("#ppPhoto"),
    preview: $("#ppPreview"),
    submit: $("#ppSubmit"),
    cancel: $("#ppCancel")
  };

  if (!els.grid || !els.form) return;

  let entries = load();
  let editingId = null;
  let currentPhoto = "";
  let filter = "";

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(entries)); }
    catch (e) { say("Browser storage is full — try a smaller photo.", true); }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function say(message, isError) {
    els.hint.textContent = message;
    els.hint.classList.toggle("is-error", Boolean(isError));
  }

  function prettyDate(value) {
    if (!value) return "Date unknown";
    const d = new Date(value + "T00:00:00");
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function resetForm() {
    els.form.reset();
    editingId = null;
    currentPhoto = "";
    els.preview.src = "";
    els.preview.hidden = true;
    els.submit.textContent = "Save passport";
    els.cancel.hidden = true;
    els.date.value = new Date().toISOString().slice(0, 10);
    say("Ready for a new plant memory.");
  }

  function editEntry(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    editingId = id;
    currentPhoto = entry.photo || "";
    els.student.value = entry.student || "";
    els.plant.value = entry.plant || "";
    els.species.value = entry.species || "";
    els.date.value = entry.date || "";
    els.note.value = entry.note || "";
    if (currentPhoto) { els.preview.src = currentPhoto; els.preview.hidden = false; }
    els.submit.textContent = "Update passport";
    els.cancel.hidden = false;
    say(`Editing ${entry.plant}'s passport.`);
    els.form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteEntry(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    if (!window.confirm(`Remove ${entry.plant} brought by ${entry.student}?`)) return;
    entries = entries.filter((e) => e.id !== id);
    save();
    render();
    if (editingId === id) resetForm();
    say("Passport removed.");
  }

  function card(entry) {
    const photo = entry.photo
      ? `<img src="${esc(entry.photo)}" alt="${esc(entry.plant)} brought by ${esc(entry.student)}">`
      : `<span aria-hidden="true">🌿</span>`;
    const species = entry.species ? esc(entry.species) + " · " : "";
    const note = entry.note ? esc(entry.note) : "No note yet — add one when you edit this passport.";
    return `<article class="passport-card">
      <div class="passport-photo">${photo}</div>
      <div class="passport-card__body">
        <p class="passport-student">Brought by ${esc(entry.student)}</p>
        <h3>${esc(entry.plant)}</h3>
        <p class="passport-meta">${species}${prettyDate(entry.date)}</p>
        <p class="passport-note">${note}</p>
        <div class="passport-actions">
          <button type="button" data-edit="${esc(entry.id)}">✎ Edit</button>
          <button type="button" data-delete="${esc(entry.id)}">× Remove</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const q = filter.trim().toLowerCase();
    const shown = entries
      .filter((e) => !q || [e.student, e.plant, e.species, e.note].join(" ").toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    els.grid.innerHTML = shown.length
      ? shown.map(card).join("")
      : `<div class="passport-empty">
           <b>${q ? "No passports match that search." : "No passports yet."}</b>
           <span>${q ? "Try a different student or plant name." : "Fill in the form below to remember your first plant."}</span>
         </div>`;

    const plural = (n) => n === 1 ? "passport" : "passports";
    els.count.textContent = q ? `${shown.length} of ${entries.length} ${plural(entries.length)}` : `${entries.length} ${plural(entries.length)}`;
    els.statEntries.textContent = entries.length;
    els.statPlants.textContent = new Set(entries.map((e) => (e.plant || "").toLowerCase()).filter(Boolean)).size;
    els.statStudents.textContent = new Set(entries.map((e) => (e.student || "").toLowerCase()).filter(Boolean)).size;
  }

  function compressPhoto(file) {
    if (file.size > 6 * 1024 * 1024) {
      say("That image is too large — choose one under 6 MB.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const size = 480;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        currentPhoto = canvas.toDataURL("image/jpeg", .8);
        els.preview.src = currentPhoto;
        els.preview.hidden = false;
        say("Photo added to this passport.");
      };
      img.onerror = function () { say("Could not read that image.", true); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------------- events ----------------
  els.photo.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) compressPhoto(file);
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const student = els.student.value.trim();
    const plant = els.plant.value.trim();
    if (!student || !plant) { say("Add at least a student name and a plant name.", true); return; }

    const existing = editingId ? entries.find((x) => x.id === editingId) : null;
    const entry = {
      id: existing ? existing.id : "pp-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      student: student,
      plant: plant,
      species: els.species.value.trim(),
      date: els.date.value,
      note: els.note.value.trim(),
      photo: currentPhoto,
      createdAt: existing ? existing.createdAt : Date.now()
    };

    if (existing) entries = entries.map((x) => (x.id === existing.id ? entry : x));
    else entries.push(entry);

    save();
    resetForm();
    filter = "";
    els.search.value = "";
    render();
    say(`Passport saved for ${entry.plant}, brought by ${entry.student}.`);
  });

  els.cancel.addEventListener("click", () => { resetForm(); say("Edit cancelled."); });

  els.search.addEventListener("input", (e) => { filter = e.target.value; render(); });

  els.grid.addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) { editEntry(edit.dataset.edit); return; }
    const del = e.target.closest("[data-delete]");
    if (del) deleteEntry(del.dataset.delete);
  });

  // ---------------- start ----------------
  els.date.value = new Date().toISOString().slice(0, 10);
  els.cancel.hidden = true;
  render();
})();
