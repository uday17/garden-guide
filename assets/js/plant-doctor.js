/* ==========================================================================
   Gardening — Plant Health Assistant
   On-device photo colour analysis + a small rule-based care expert.
   No uploads, no API calls, no personal data leaves the browser.
   ========================================================================== */
(function () {
  "use strict";

  const chat = document.getElementById("doctorChat");
  if (!chat) return;

  const form = document.getElementById("doctorForm");
  const fileInput = document.getElementById("doctorImage");
  const dropZone = document.getElementById("doctorDrop");
  const preview = document.getElementById("doctorPreview");
  const plantSelect = document.getElementById("doctorPlant");
  const statusEl = document.getElementById("doctorStatus");
  const askForm = document.getElementById("doctorAsk");
  const askInput = document.getElementById("doctorQuestion");

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);

  if (plantSelect && window.PLANTS) {
    plantSelect.innerHTML =
      '<option value="">Not sure</option>' +
      window.PLANTS.map(
        (p) => '<option value="' + esc(p.name) + '">' + esc(p.name) + "</option>"
      ).join("");
  }

  let currentFile = null;
  let lastResult = null;

  /* ---------------- chat plumbing ---------------- */
  function addMessage(who, html) {
    const msg = document.createElement("div");
    msg.className = "msg msg--" + who;
    msg.innerHTML =
      '<span class="msg__avatar" aria-hidden="true">' +
      (who === "bot" ? "🌿" : "🙂") +
      "</span>" +
      '<div class="msg__body">' + html + "</div>";
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
    return msg;
  }

  function bot(text) {
    return addMessage("bot", "<p>" + esc(text) + "</p>");
  }

  /* ---------------- image handling ---------------- */
  function setFile(file) {
    if (!file) return;
    if (!file.type || file.type.indexOf("image/") !== 0) {
      statusEl.textContent = "Please choose an image file (JPG, PNG or WebP).";
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      statusEl.textContent = "That image is over 12 MB. Please choose a smaller one.";
      return;
    }
    currentFile = file;
    statusEl.textContent = "Photo ready: " + file.name;

    if (preview) {
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    }
    if (dropZone) dropZone.classList.add("has-file");

    addMessage(
      "user",
      '<p>Here is my plant photo.</p><img class="msg__photo" src="' +
        esc(URL.createObjectURL(file)) +
        '" alt="Plant photo uploaded by the user">'
    );
    bot("Thanks — I can see the image. Answer the four questions below and I'll check the colours in the photo against your description.");
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => setFile(e.target.files[0]));
  }
  if (dropZone) {
    ["dragenter", "dragover"].forEach((type) =>
      dropZone.addEventListener(type, (e) => {
        e.preventDefault();
        dropZone.classList.add("is-dragging");
      })
    );
    ["dragleave", "drop"].forEach((type) =>
      dropZone.addEventListener(type, (e) => {
        e.preventDefault();
        dropZone.classList.remove("is-dragging");
      })
    );
    dropZone.addEventListener("drop", (e) => {
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) setFile(file);
    });
  }

  /* ---------------- colour analysis ---------------- */
  function analyse(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the image."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not open that image."));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 240 / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let data;
          try {
            data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          } catch (e) {
            reject(new Error("This image could not be analysed."));
            return;
          }

          let total = 0, green = 0, yellow = 0, brown = 0, dark = 0, bright = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r + g + b < 75) continue; /* ignore near-black backgrounds */
            total++;
            if (g > r * 1.06 && g > b * 1.05 && g > 55) green++;
            else if (r > 105 && g > 95 && b < Math.min(r, g) * 0.74) yellow++;
            else if (r > g * 1.16 && g > b * 1.12 && r > 55 && g < 155) brown++;
            if (g < 85 && r < 105 && b < 105) dark++;
            if ((r + g + b) / 3 > 195) bright++;
          }
          if (!total) {
            reject(new Error("The photo appears to be empty or too dark."));
            return;
          }
          const pct = (n) => Math.round((n / total) * 100);
          resolve({
            green: pct(green), yellow: pct(yellow), brown: pct(brown),
            dark: pct(dark), bright: pct(bright),
            width: img.width, height: img.height
          });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------------- expert rules ---------------- */
  const CONDITIONS = [
    {
      id: "wet",
      title: "Likely overwatering or early root stress",
      score(a, s) {
        let n = 0;
        if (a.water === "daily") n += 3;
        if (a.water === "2-3") n += 1;
        if (a.symptom === "wiltWet") n += 4;
        if (a.symptom === "yellowSoft") n += 3;
        if (a.symptom === "spotsSoft") n += 2;
        if (s.green < 26) n += 2;
        if (s.brown > 16) n += 1;
        if (a.light === "low" && a.water === "daily") n += 2;
        return n;
      },
      summary: "Roots need air as well as water. When soil stays wet, they begin to suffocate and can rot — the plant then shows yellow, soft lower leaves and may wilt even though the soil is damp.",
      checks: ["Does the soil still feel wet 3–4 days after watering?", "Is there a sour smell from the pot?", "Are the lower leaves yellow and soft rather than crisp?"],
      actions: ["Stop watering until the top 3–4 cm is dry.", "Check the drainage holes and empty the saucer after every watering.", "If the base is mushy, unpot, cut away brown roots and repot in fresh free-draining mix.", "Move to a brighter, well-ventilated spot."],
      prevent: ["Water by feel, never by calendar.", "Use a pot with several drainage holes and a gritty mix for succulents.", "Reduce watering sharply in winter."],
      link: "care.html#water", linkText: "Watering guide"
    },
    {
      id: "dry",
      title: "Likely underwatering or dry roots",
      score(a, s) {
        let n = 0;
        if (a.water === "rarely") n += 3;
        if (a.symptom === "wiltDry") n += 4;
        if (a.symptom === "brownTips") n += 3;
        if (s.brown > 14) n += 2;
        if (s.yellow > 16) n += 1;
        if (a.place === "outdoor" && a.light === "direct") n += 1;
        return n;
      },
      summary: "When the root zone dries out completely, fine root hairs die back. Leaves go limp, then brown and crispy at the tips — especially in small pots, hot sun or wind.",
      checks: ["Is the soil pulling away from the pot edge?", "Does the pot feel very light when lifted?", "Are the brown areas dry and papery, not soft?"],
      actions: ["Water slowly and deeply until water runs from the drainage holes.", "Empty the saucer after 20 minutes.", "Trim off crispy brown tips with clean scissors.", "Move out of hot midday sun for a week while it recovers."],
      prevent: ["Check small pots every 2–3 days in summer.", "Mulch outdoor pots to slow evaporation.", "Group plants together to raise local humidity."],
      link: "care.html#water", linkText: "Watering guide"
    },
    {
      id: "light",
      title: "Likely too little light",
      score(a, s) {
        let n = 0;
        if (a.light === "low") n += 4;
        if (a.symptom === "leggy") n += 4;
        if (a.symptom === "noGrowth") n += 3;
        if (a.symptom === "yellow") n += 1;
        if (s.green < 22) n += 2;
        if (s.bright > 35) n += 1;
        return n;
      },
      summary: "Light is food. In low light, a plant stretches toward the window, producing pale, thin stems and few or no flowers. Extra feed cannot fix this — only more usable light can.",
      checks: ["Are the new shoots pale and longer than the older growth?", "Is the plant leaning toward a window?", "Has growth almost stopped since winter?"],
      actions: ["Move the plant gradually closer to a bright window over 7–10 days.", "Rotate the pot a quarter turn each week.", "Prune leggy stems back to a leaf node once new light is established.", "Wipe dust from the leaves."],
      prevent: ["Match the plant to the light you actually have — check our library before buying.", "In winter, expect slower growth and water less.", "Consider a grow light for dark rooms."],
      link: "basics.html#light", linkText: "Light guide"
    },
    {
      id: "scorch",
      title: "Likely sun scorch",
      score(a, s) {
        let n = 0;
        if (a.light === "direct") n += 3;
        if (a.place !== "indoor") n += 1;
        if (a.symptom === "brownTips") n += 3;
        if (s.brown > 18) n += 2;
        if (s.bright > 30) n += 1;
        return n;
      },
      summary: "Sudden strong sun burns leaf tissue, leaving dry, bleached or dark brown patches — often on the side facing the sun. Indoor plants moved outside are especially vulnerable.",
      checks: ["Are the damaged patches on the sunniest side only?", "Did you move the plant recently?", "Are patches dry and papery rather than soft?"],
      actions: ["Move it out of midday sun immediately.", "Trim away the worst damaged leaves.", "Water deeply at the base and mulch outdoor pots.", "Shade with a cloth or shade net for a week."],
      prevent: ["Acclimatise indoor plants outdoors over 7–10 days.", "Give morning sun rather than harsh afternoon sun to tender plants.", "Use shade cloth in peak summer."],
      link: "care.html#troubleshooting", linkText: "Problem solver"
    },
    {
      id: "nutrient",
      title: "Likely nutrient deficiency",
      score(a, s) {
        let n = 0;
        if (a.symptom === "yellow") n += 3;
        if (a.symptom === "noGrowth") n += 1;
        if (s.yellow > 18) n += 3;
        if (s.green < 30) n += 1;
        if (a.water === "daily") n -= 2;
        return n;
      },
      summary: "Yellowing between the veins, especially on older leaves, usually means nitrogen or magnesium is short. If the veins stay green while the rest pales, the cause is often iron unavailable at high pH.",
      checks: ["Are older leaves yellowing first?", "Do the veins stay green while the leaf between them pales?", "Has it been more than 6–8 weeks since feeding in spring or summer?"],
      actions: ["Feed with a balanced liquid fertiliser at half strength.", "For iron-type yellowing, check soil pH — aim for 6.0–7.0.", "Remove badly yellowed leaves so the plant can redirect energy.", "Flush the pot with plain water if you have been feeding heavily."],
      prevent: ["Feed only during active growth, every 2–4 weeks.", "Top-dress pots with compost or worm castings each spring.", "Test soil pH before adding more fertiliser."],
      link: "soil.html#ph", linkText: "Soil pH guide"
    },
    {
      id: "pests",
      title: "Likely pest activity",
      score(a, s) {
        let n = 0;
        if (a.symptom === "pests") n += 6;
        if (s.dark > 20) n += 1;
        if (a.place === "indoor") n += 1;
        return n;
      },
      summary: "Tiny insects, fine webbing or sticky residue point to aphids, spider mites, mealybugs or whitefly. They suck sap, so leaves speckle, curl and lose vigour.",
      checks: ["Look closely under the leaves and in leaf joints.", "Is there fine webbing or a sticky shine on leaves?", "Are new shoots distorted or clustered with tiny insects?"],
      actions: ["Isolate the plant from others.",
        "Wash the foliage with a gentle water spray, then treat with insecticidal soap or neem, covering leaf undersides.",
        "Repeat every 5–7 days for at least three rounds to catch new hatches.",
        "Remove badly infested leaves."],
      prevent: ["Quarantine new plants for two weeks.", "Keep humidity up and avoid dusty, still corners.", "Encourage ladybirds and lacewings outdoors."],
      link: "care.html#pests", linkText: "Pests & diseases"
    },
    {
      id: "fungus",
      title: "Possible fungal leaf spot",
      score(a, s) {
        let n = 0;
        if (a.symptom === "spotsSoft") n += 4;
        if (s.dark > 22) n += 2;
        if (a.place === "outdoor") n += 1;
        if (a.water === "daily") n += 1;
        return n;
      },
      summary: "Dark spots with yellow halos, especially after humid or wet weather, are often fungal leaf spot. Wet foliage and poor airflow let spores germinate.",
      checks: ["Do spots have a dark centre and yellow edge?", "Have leaves been wet overnight?", "Is the plant crowded against other plants or a wall?"],
      actions: ["Remove and discard affected leaves — do not compost them.", "Water at the base, early in the day.", "Improve airflow by thinning crowded growth.", "Try potassium bicarbonate or neem spray if spots keep spreading."],
      prevent: ["Avoid overhead watering.", "Space plants so air can move between them.", "Clean up fallen leaves in autumn."],
      link: "care.html#pests", linkText: "Pests & diseases"
    },
    {
      id: "healthy",
      title: "Your plant looks fairly healthy",
      score(a, s) {
        let n = 0;
        if (a.symptom === "none") n += 5;
        if (s.green >= 30) n += 2;
        if (a.water !== "daily" && a.water !== "rarely") n += 1;
        if (s.brown > 18) n -= 3;
        return n;
      },
      summary: "No obvious problem was reported and the photo is mostly green. Keep doing what you are doing — consistency is the best care routine.",
      checks: ["Are new leaves appearing normally?", "Is the soil drying between waterings?"],
      actions: ["Keep your current light and watering routine.", "Feed lightly during active growth.", "Check leaf undersides once a week for early pest signs."],
      prevent: ["Take a photo every month — changes are easier to spot side by side.", "Use our planner to keep track of tasks and notes."],
      link: "care.html", linkText: "Full care guide"
    }
  ];

  /* ---------------- diagnosis output ---------------- */
  function buildResult(stats, answers) {
    const ranked = CONDITIONS
      .map((c) => ({ c: c, n: c.score(answers, stats) }))
      .sort((a, b) => b.n - a.n);
    const winner = ranked[0];
    const confidence = winner.n >= 7 ? "high" : winner.n >= 4 ? "medium" : "low";
    const plant = (window.PLANTS || []).find((p) => p.name === answers.plant);

    let extra = "";
    if (plant) {
      extra =
        "<div class='doctor__note'><strong>Plant-specific note — " + esc(plant.name) +
        ":</strong> it normally wants <em>" + esc(plant.light.toLowerCase()) +
        "</em> and water <em>" + esc(plant.water.toLowerCase()) +
        "</em>. " + esc(plant.tip) + "</div>";
    }

    return {
      title: winner.c.title,
      confidence: confidence,
      html:
        "<div class='diagnosis'>" +
          "<div class='diagnosis__head'><h4>" + esc(winner.c.title) + "</h4>" +
          "<span class='pill " + (confidence === "high" ? "" : "pill--accent") + "'>" +
          confidence + " confidence</span></div>" +
          "<p>" + esc(winner.c.summary) + "</p>" +
          "<div class='doctor__bars' aria-label='Colours detected in your photo'>" +
            ["green", "yellow", "brown"].map((k) =>
              "<div class='doctor__bar'><span>" + k + "</span>" +
              "<i style='width:" + stats[k] + "%'></i><b>" + stats[k] + "%</b></div>"
            ).join("") +
          "</div>" +
          "<div class='doctor__note'><strong>Photo signals:</strong> " + stats.green +
          "% green, " + stats.yellow + "% yellow, " + stats.brown +
          "% brown. Compared with your answers, the closest match is <strong>" +
          esc(winner.c.title.toLowerCase()) + "</strong>.</div>" +
          extra +
          "<p class='doctor__label'>Quick checks</p><ul>" +
          winner.c.checks.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
          "<p class='doctor__label'>What to do now</p><ol>" +
          winner.c.actions.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>" +
          "<p class='doctor__label'>To prevent it coming back</p><ul>" +
          winner.c.prevent.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
          "<p><a class='btn btn--ghost btn--sm' href='" + winner.c.link + "'>" +
          "Read the " + esc(winner.c.linkText) + " →</a></p>" +
          "<p class='small muted'>This is guidance from your photo and answers, not a laboratory diagnosis. " +
          "If the plant keeps declining, ask a local nursery or extension service.</p>" +
        "</div>"
    };
  }

  /* ---------------- main form ---------------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    if (!currentFile) {
      bot("Please attach a photo first so I can look at the leaf colours.");
      fileInput.focus();
      return;
    }
    const answers = {
      plant: document.getElementById("doctorPlant").value,
      place: document.getElementById("doctorPlace").value,
      light: document.getElementById("doctorLight").value,
      water: document.getElementById("doctorWater").value,
      symptom: document.getElementById("doctorSymptom").value
    };
    statusEl.textContent = "Analysing your photo…";
    const pending = addMessage("bot", "<p>Analysing the photo and your answers…</p>");

    analyse(currentFile)
      .then((stats) => {
        pending.remove();
        lastResult = buildResult(stats, answers);
        statusEl.textContent = "Analysis complete — this stays in your browser.";
        addMessage("bot", lastResult.html);
      })
      .catch((err) => {
        pending.remove();
        statusEl.textContent = err.message;
        bot("I couldn't read that image. Please try a clear JPG or PNG of the leaves.");
      });
  });

  /* ---------------- follow-up questions ---------------- */
  const FAQ = [
    { keys: ["water", "thirst", "dry", "wet"], text: "Water by feel: push a finger 3 cm into the soil. Dry means water deeply until it drains; damp means wait. Most problems come from watering too often.", link: "care.html#water", label: "watering guide" },
    { keys: ["light", "sun", "shade", "window", "dark"], text: "Match light to the plant: full sun is 6+ hours direct, bright indirect is daylight with no direct rays on leaves. Increase light gradually over 7–10 days.", link: "basics.html#light", label: "light guide" },
    { keys: ["yellow", "pale", "chloros"], text: "Yellow older leaves often mean nitrogen shortage; yellow between green veins can mean iron shortage or high pH. Check pH before adding more feed.", link: "soil.html#ph", label: "soil pH guide" },
    { keys: ["brown", "crisp", "tip", "burn"], text: "Crispy brown tips usually mean dry air or missed water. Soft brown patches mean too much water. Which one do you see?", link: "care.html#troubleshooting", label: "problem solver" },
    { keys: ["pest", "bug", "insect", "web", "aphid", "mite"], text: "Check leaf undersides. Wash with water, then use insecticidal soap or neem every 5–7 days for three rounds. Isolate the plant.", link: "care.html#pests", label: "pests guide" },
    { keys: ["feed", "fertil", "nutrient", "food"], text: "Feed only while the plant is actively growing, at half strength every 2–4 weeks. Never feed a dry or sick root ball.", link: "care.html#feed", label: "feeding guide" },
    { keys: ["repot", "pot", "root"], text: "Repot in spring when roots circle the pot or water runs straight through. Go only 2–4 cm wider and avoid feeding for a month.", link: "care.html#repot", label: "repotting guide" },
    { keys: ["spot", "fungus", "mould", "mold", "mildew"], text: "Remove spotted leaves, water at the base in the morning, and improve airflow. Fungus thrives on wet foliage and still air.", link: "care.html#pests", label: "pests & diseases" }
  ];

  if (askForm) {
    askForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = askInput.value.trim();
      if (!q) return;
      addMessage("user", "<p>" + esc(q) + "</p>");
      askInput.value = "";
      const lower = q.toLowerCase();
      const hit = FAQ.find((f) => f.keys.some((k) => lower.indexOf(k) !== -1));
      if (hit) {
        addMessage("bot", "<p>" + esc(hit.text) + "</p><p><a href='" + hit.link + "'>" + esc(hit.label) + " →</a></p>");
      } else {
        bot("Try asking about watering, light, yellow leaves, brown tips, pests, feeding, repotting or spots. You can also upload a new photo above.");
      }
    });
  }
})();
