/* NDC-TIA 2.0 freight dashboard — renders index.html from data/data.json */
(function () {
  "use strict";

  var DATA = null;
  var COLORS = null;
  var CURRENT_COUNTRY = "China";

  /* ---------------- helpers ---------------- */

  function el(tag, opts) {
    opts = opts || {};
    var node = document.createElement(tag);
    if (opts.cls) node.className = opts.cls;
    if (opts.html !== undefined) node.innerHTML = opts.html;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (k) { node.setAttribute(k, opts.attrs[k]); });
    }
    if (opts.children) {
      opts.children.forEach(function (c) { if (c) node.appendChild(c); });
    }
    return node;
  }

  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Escapes text, then applies a light markdown-style syntax on top:
  // **word** -> bold, [label](url) -> link. Plain text with none of that
  // syntax passes through unchanged, so it's always safe to call.
  function formatText(str) {
    return esc(str)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  // Turns "Heading\n- bullet\n- bullet" style strings (or plain text with newlines) into HTML paragraphs/lists.
  function richText(str) {
    if (!str) return "";
    var lines = String(str).split("\n");
    var html = "";
    var inList = false;
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (trimmed.indexOf("- ") === 0 || trimmed.indexOf("-") === 0 && trimmed.length > 1 && trimmed[1] === " ") {
        if (!inList) { html += "<ul class='bullets'>"; inList = true; }
        html += "<li>" + formatText(trimmed.replace(/^-\s*/, "")) + "</li>";
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        if (trimmed.length) html += "<p>" + formatText(trimmed) + "</p>";
      }
    });
    if (inList) html += "</ul>";
    return html;
  }

  function pct(x) { return Math.round(x * 1000) / 10 + "%"; }

  // Flag icons for country names used in illustrative example cards.
  // Looked up by exact country name; names not listed here (e.g. category
  // labels used in the National Ambition tab's example cards) simply get no icon.
  var COUNTRY_FLAGS = {
    "Armenia": "am", "Cambodia": "kh", "China": "cn", "Georgia": "ge",
    "India": "in", "Indonesia": "id", "Iraq": "iq", "Maldives": "mv",
    "Nepal": "np", "Republic of Korea": "kr", "Sri Lanka": "lk",
    "Thailand": "th", "United Arab Emirates": "ae", "Viet Nam": "vn"
  };

  function countryColor(name) {
    return (COLORS && COLORS[name]) || "#999999";
  }

  // Picks black or white text for legibility against a given hex background (WCAG-ish relative luminance).
  function readableTextColor(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return "#fff";
    var r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
    var lin = [r, g, b].map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    return lum > 0.5 ? "#1D1C1D" : "#fff";
  }

  function section(headingText, contentNodes, opts) {
    opts = opts || {};
    var sec = el("div", { cls: "section" });
    sec.appendChild(el("div", { cls: "section-band", text: headingText }));
    (contentNodes || []).forEach(function (n) { if (n) sec.appendChild(n); });
    return sec;
  }

  function subheading(text) {
    return el("div", { cls: "subheading", text: text });
  }

  function para(text) {
    return el("p", { html: formatText(text) });
  }

  function bulletList(items) {
    var ul = el("ul", { cls: "bullets" });
    items.forEach(function (t) { ul.appendChild(el("li", { html: formatText(t) })); });
    return ul;
  }

  /* ---------------- generic chart builders ---------------- */

  // Horizontal grouped bar chart: one row per category, mini-bars per series.
  // series: [{name, share:[...], count:[...]}] ; valueMode: 'percent' | 'count'
  function hbarChart(categories, series, opts) {
    opts = opts || {};
    var valueKey = opts.valueKey || "share";
    var formatter = opts.formatter || pct;
    var maxVal = 0;
    series.forEach(function (s) {
      s[valueKey].forEach(function (v) { if (v > maxVal) maxVal = v; });
    });
    if (maxVal === 0) maxVal = 1;

    var card = el("div", { cls: "chart-card" });
    if (opts.title) card.appendChild(el("div", { cls: "chart-title", text: opts.title }));

    categories.forEach(function (cat, ci) {
      var row = el("div", { cls: "hbar-row" });
      row.appendChild(el("div", { cls: "hbar-cat", text: cat }));
      var track = el("div", { cls: "hbar-track" });
      series.forEach(function (s) {
        var v = s[valueKey][ci];
        var widthPct = Math.max((v / maxVal) * 100, v > 0 ? 2 : 0);
        var barWrap = el("div", { cls: "hbar-series" });
        var bar = el("div", { cls: "bar", attrs: { style: "width:" + widthPct + "%; background:" + (s.color || countryColor(s.name)) + ";" } });
        barWrap.appendChild(bar);
        barWrap.appendChild(el("span", { cls: "val", text: formatter(v) }));
        track.appendChild(barWrap);
      });
      row.appendChild(track);
      card.appendChild(row);
    });

    var legend = el("div", { cls: "legend" });
    series.forEach(function (s) {
      var item = el("div", { cls: "legend-item" });
      item.appendChild(el("span", { cls: "legend-swatch", attrs: { style: "background:" + (s.color || countryColor(s.name)) + ";" } }));
      var label = s.name + (s.labelSuffix ? " (" + s.labelSuffix + ")" : "");
      item.appendChild(el("span", { text: label }));
      legend.appendChild(item);
    });
    card.appendChild(legend);

    if (opts.footnotes && opts.footnotes.length) {
      opts.footnotes.forEach(function (f) {
        card.appendChild(el("p", { cls: "footnote", text: f }));
      });
    }
    return card;
  }

  // Single donut with one or more concentric rings (outer ring = rings[0]).
  // Each ring: {label, value (0-1), color}.
  function donutRing(title, rings) {
    var cx = 105, cy = 105, strokeWidth = 21; // 50% larger than the original 70/70/14
    var radii = [81, 54, 30];
    var svgParts = [];
    rings.forEach(function (ring, i) {
      var r = radii[i] || (radii[radii.length - 1] - 24 * (i - radii.length + 1));
      var c = 2 * Math.PI * r;
      var filled = Math.max(ring.value, 0) * c;
      svgParts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#E3ECEC" stroke-width="' + strokeWidth + '"/>');
      svgParts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + ring.color + '" stroke-width="' + strokeWidth +
        '" stroke-linecap="round" stroke-dasharray="' + filled.toFixed(2) + ' ' + (c - filled).toFixed(2) +
        '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>');
    });
    var svgHtml = '<svg viewBox="0 0 210 210" width="210" height="210" role="img" aria-label="' + esc(title) + '">' + svgParts.join("") + "</svg>";

    var card = el("div", { cls: "donut-card" });
    card.appendChild(el("div", { cls: "donut-title", text: title }));
    card.appendChild(el("div", { cls: "donut-svg", html: svgHtml }));
    var legend = el("div", { cls: "legend donut-legend" });
    rings.forEach(function (ring) {
      var item = el("div", { cls: "legend-item" });
      item.appendChild(el("span", { cls: "legend-swatch", attrs: { style: "background:" + ring.color + ";" } }));
      item.appendChild(el("span", { text: ring.label + " — " + pct(ring.value) }));
      legend.appendChild(item);
    });
    card.appendChild(legend);
    return card;
  }

  // Renders one donut per metric (e.g. NDC, LTS), each comparing Global (outer ring) vs Asia (inner ring).
  function donutComparisonChart(chartData) {
    var wrap = el("div", { cls: "chart-card" });
    wrap.appendChild(el("div", { cls: "chart-title", text: chartData.title }));
    var row = el("div", { cls: "donut-row" });
    chartData.metrics.forEach(function (m) {
      row.appendChild(donutRing(m.label, [
        { label: "Global", value: m.global, color: countryColor("Global") },
        { label: "Asia", value: m.asia, color: countryColor("Asia") }
      ]));
    });
    wrap.appendChild(row);
    return wrap;
  }

  // Sequential single-hue ramp (light tint -> brand teal-dark) for heatmap cells.
  function heatColor(t) {
    t = Math.max(0, Math.min(1, t));
    var light = [227, 236, 236], dark = [6, 132, 132];
    var rgb = light.map(function (c0, i) { return Math.round(c0 + (dark[i] - c0) * t); });
    return "#" + rgb.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  // Heatmap: rows = categories, columns = series. Cell shade encodes magnitude
  // (shared scale across all series so shades are comparable across columns).
  function heatmapChart(categories, series, opts) {
    opts = opts || {};
    var maxVal = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { if (v > maxVal) maxVal = v; }); });
    if (maxVal === 0) maxVal = 1;

    var card = el("div", { cls: "chart-card" });
    if (opts.title) card.appendChild(el("div", { cls: "chart-title", text: opts.title }));

    var wrap = el("div", { cls: "table-wrap" });
    var table = el("table", { cls: "heatmap-table" });
    var thead = el("thead");
    var htr = el("tr");
    htr.appendChild(el("th", { text: "" }));
    series.forEach(function (s) {
      htr.appendChild(el("th", { text: s.name + (s.labelSuffix ? " (" + s.labelSuffix + ")" : "") }));
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    var tbody = el("tbody");
    categories.forEach(function (cat, ci) {
      var row = el("tr");
      row.appendChild(el("th", { cls: "heatmap-rowhead", text: cat }));
      series.forEach(function (s) {
        var v = s.values[ci];
        var bg = heatColor(v / maxVal);
        row.appendChild(el("td", {
          cls: "heatmap-cell", text: String(v),
          attrs: { style: "background:" + bg + "; color:" + readableTextColor(bg) + ";" }
        }));
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    card.appendChild(wrap);

    var scale = el("div", { cls: "heatmap-scale" });
    scale.appendChild(el("span", { cls: "heatmap-scale-label", text: "Fewer actions" }));
    scale.appendChild(el("div", { cls: "heatmap-scale-bar" }));
    scale.appendChild(el("span", { cls: "heatmap-scale-label", text: "More actions" }));
    card.appendChild(scale);

    return card;
  }

  /* ---------------- generic table builder ---------------- */

  function dataTable(columns, rows) {
    var wrap = el("div", { cls: "table-wrap" });
    var table = el("table", { cls: "data-table" });
    var thead = el("thead");
    var htr = el("tr");
    columns.forEach(function (c) { htr.appendChild(el("th", { text: c })); });
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = el("tbody");
    rows.forEach(function (r) { tbody.appendChild(r); });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function tr(cells) {
    var row = el("tr");
    cells.forEach(function (c) { row.appendChild(c); });
    return row;
  }

  function td(text, cls) {
    return el("td", { cls: cls, text: text });
  }

  // A data table filtered by a country toggle above it. `rows` must each have
  // a `.country` field; `cellsFn(row)` builds the <tr> for the currently-shown rows.
  function countryToggleTable(rows, columns, cellsFn) {
    var countries = [];
    rows.forEach(function (r) { if (countries.indexOf(r.country) === -1) countries.push(r.country); });

    var wrap = el("div", { cls: "toggle-table" });
    var toggle = el("div", { cls: "mini-toggle" });
    var tableSlot = el("div");

    function show(country) {
      Array.prototype.forEach.call(toggle.children, function (b) {
        b.classList.toggle("active", b.getAttribute("data-value") === country);
      });
      tableSlot.innerHTML = "";
      var filtered = rows.filter(function (r) { return r.country === country; }).map(cellsFn);
      tableSlot.appendChild(dataTable(columns, filtered));
    }

    countries.forEach(function (c) {
      var btn = el("button", { cls: "mini-toggle-btn", text: c, attrs: { type: "button", "data-value": c } });
      btn.addEventListener("click", function () { show(c); });
      toggle.appendChild(btn);
    });

    wrap.appendChild(toggle);
    wrap.appendChild(tableSlot);
    show(countries[0]);
    return wrap;
  }

  /* ================================================================
     INTRO (shared masthead-adjacent block, rendered at top of Overview)
     ================================================================ */

  function renderIntro(container) {
    var intro = DATA.intro;
    var wrap = el("div", { cls: "intro-block" });

    var left = el("div", { cls: "intro-left" });
    intro.paragraphs.forEach(function (p) { left.appendChild(para(p)); });

    var implBlock = el("div", { cls: "implemented-by" });
    implBlock.appendChild(el("div", { cls: "label", text: intro.implementedByLabel }));
    var logos = el("div", { cls: "partner-logos" });
    intro.partnerLogos.forEach(function (l) {
      var img = el("img", { attrs: { src: l.src, alt: l.alt } });
      if (l.link) {
        var a = el("a", { attrs: { href: l.link, target: "_blank", rel: "noopener" } });
        a.appendChild(img);
        logos.appendChild(a);
      } else {
        logos.appendChild(img);
      }
    });
    implBlock.appendChild(logos);
    left.appendChild(implBlock);

    var about = el("div", { cls: "about-card" });
    about.appendChild(el("h3", { text: intro.about.heading }));
    intro.about.paragraphs.forEach(function (p) { about.appendChild(el("p", { text: p })); });
    about.appendChild(el("div", { cls: "data-as-of", text: intro.about.dataAsOf }));

    wrap.appendChild(left);
    wrap.appendChild(about);
    container.appendChild(wrap);
  }

  /* ================================================================
     TAB 1 — OVERVIEW
     ================================================================ */

  function renderOverview() {
    var root = document.getElementById("panel-overview");
    root.innerHTML = "";
    renderIntro(root);

    var ov = DATA.overview;

    /* -- Freight actions mentioned in NDCs -- */
    var fa = ov.freightActions;
    var faContent = [para(fa.intro)];
    var fig = el("figure", { cls: "figure figure-narrow" });
    fig.appendChild(el("img", { attrs: { src: fa.image, alt: fa.imageAlt } }));
    fig.appendChild(el("figcaption", { text: "Most frequently used terms in freight-related climate actions across Asia." }));
    faContent.push(fig);
    faContent.push(el("div", { cls: "stat-callout", html: formatText(fa.stat) }));
    root.appendChild(section(fa.heading, faContent));

    /* -- Overview of UNFCCC submissions -- */
    var sub = ov.submissions;
    var subContent = [para(sub.intro)];
    var statPair = el("div", { cls: "stat-pair" });
    sub.stats.forEach(function (s) {
      var box = el("div", { cls: "stat-box" });
      box.appendChild(el("div", { cls: "stat-group", text: s.group }));
      var ul = el("ul");
      s.items.forEach(function (i) { ul.appendChild(el("li", { text: i })); });
      box.appendChild(ul);
      statPair.appendChild(box);
    });
    subContent.push(statPair);
    if (sub.submissionShareChart) subContent.push(donutComparisonChart(sub.submissionShareChart));
    subContent.push(subheading(sub.tableHeading));
    var subRows = sub.table.rows.map(function (r) {
      var cells = [td(r.country, "country-cell")];
      r.values.forEach(function (v) { cells.push(td(v)); });
      return tr(cells);
    });
    subContent.push(dataTable(["Country"].concat(sub.table.columns), subRows));
    sub.narrative.forEach(function (n) {
      subContent.push(el("div", { cls: "insight-label", text: n.heading }));
      subContent.push(para(n.text));
      if (n.bullets && n.bullets.length) subContent.push(bulletList(n.bullets));
    });
    root.appendChild(section(sub.heading, subContent));

    /* -- Targets -- */
    var tg = ov.targets;
    var tgContent = [para(tg.intro)];
    tgContent.push(subheading(tg.economyWide.heading));
    var ewRows = tg.economyWide.rows.map(function (r) {
      var cells = [td(r.country, "country-cell")];
      r.values.forEach(function (v) { cells.push(td(v)); });
      return tr(cells);
    });
    ewRows.push(tr([td("Source", "country-cell")].concat(tg.economyWide.source.map(function (s) { return td(s); }))));
    tgContent.push(dataTable(["Country"].concat(tg.economyWide.columns), ewRows));
    tgContent.push(para(tg.economyWide.note));

    tgContent.push(subheading(tg.freight.heading));
    tgContent.push(para(tg.freight.intro));
    tgContent.push(para(tg.freight.listIntro));
    tgContent.push(countryToggleTable(tg.freight.table.rows, ["Target type", "Target content relevant for freight", "Source"],
      function (r) { return tr([td(r.type), td(r.content), td(r.source)]); }
    ));
    tgContent.push(para(tg.freight.regionalExamplesIntro));
    var exList = el("div", { cls: "example-list example-list-fit example-list-lg" });
    tg.freight.regionalExamples.forEach(function (e) {
      exList.appendChild(exampleCard(e.country, e.content));
    });
    tgContent.push(exList);
    tgContent.push(el("p", { cls: "footnote", text: tg.freight.footnote }));
    root.appendChild(section(tg.heading, tgContent));

    /* -- Mitigation -- */
    var mi = ov.mitigation;
    var miContent = [para(mi.intro), el("div", { cls: "insight-label", text: mi.insight }), bulletList(mi.bullets)];
    miContent.push(hbarChart(mi.chart.categories, mi.chart.series, { title: mi.chartTitle, valueKey: "share", formatter: pct }));
    miContent.push(subheading(mi.spotlight.heading));
    var spotCards = mi.spotlight.examples.map(function (e) { return exampleCard(e.country, e.content); });
    miContent.push(carousel([spotCards.slice(0, 4), spotCards.slice(4)]));
    root.appendChild(section(mi.heading, miContent));

    /* -- Adaptation -- */
    var ad = ov.adaptation;
    var adContent = [para(ad.intro), bulletList(ad.vietnamBullets), para(ad.comparisonIntro)];
    adContent.push(hbarChart(ad.chart.categories, ad.chart.series, { title: ad.chartTitle, valueKey: "share", formatter: pct, footnotes: ad.chart.footnotes }));
    adContent.push(subheading(ad.examplesHeading));
    var adList = el("div", { cls: "example-list example-list-fit example-list-lg" });
    ad.examples.forEach(function (e) { adList.appendChild(exampleCard(e.country, e.content)); });
    adContent.push(adList);
    root.appendChild(section(ad.heading, adContent));

    /* -- Global initiatives -- */
    var gi = ov.initiatives;
    var giContent = [para(gi.intro)];
    gi.blocks.forEach(function (b) {
      var blk = el("div", { cls: "initiative-block" });
      blk.appendChild(el("h4", { text: b.title }));
      blk.appendChild(el("p", { html: formatText(b.text) }));
      giContent.push(blk);
    });
    // Transposed: initiatives as rows (each linked to its source) x countries as columns —
    // this keeps the table to 4 columns instead of 8, cutting horizontal scrolling.
    var matrixCols = ["Initiative"].concat(gi.matrix.rows.map(function (r) { return r.country; }));
    var matrixRows = gi.matrix.columns.map(function (initiative, i) {
      var nameCell = el("td", { cls: "country-cell initiative-cell" });
      nameCell.appendChild(el("a", { text: initiative.name, attrs: { href: initiative.link, target: "_blank", rel: "noopener" } }));
      var cells = [nameCell];
      gi.matrix.rows.forEach(function (r) {
        cells.push(el("td", { html: r.values[i] ? "<span class='dot-yes'>&#10003;</span>" : "<span class='dot-no'>&ndash;</span>" }));
      });
      return tr(cells);
    });
    giContent.push(dataTable(matrixCols, matrixRows));
    root.appendChild(section(gi.heading, giContent));
  }

    function exampleCard(country, content) {
    var card = el("div", { cls: "example-card" });
    var nameWrap = el("div", { cls: "country" });
    var code = COUNTRY_FLAGS[country];
    if (code) {
      nameWrap.appendChild(el("img", {
        cls: "flag-icon",
        attrs: { src: "assets/img/flags/" + code + ".svg", alt: "" }
      }));
    }
    nameWrap.appendChild(document.createTextNode(country));
    card.appendChild(nameWrap);
    card.appendChild(el("div", { cls: "content", html: formatText(content) }));
    return card;
  }

  // Paged carousel. `slideGroups` is an array of arrays of already-built card
  // nodes — each inner array is one slide (e.g. [4 cards], [3 cards]).
  function carousel(slideGroups) {
    var wrap = el("div", { cls: "carousel example-list-lg" });
    var track = el("div", { cls: "carousel-track" });
    slideGroups.forEach(function (cards) {
      var slide = el("div", { cls: "carousel-slide" });
      cards.forEach(function (c) { slide.appendChild(c); });
      track.appendChild(slide);
    });
    var viewport = el("div", { cls: "carousel-viewport" });
    viewport.appendChild(track);
    wrap.appendChild(viewport);

    var controls = el("div", { cls: "carousel-controls" });
    var prevBtn = el("button", { cls: "carousel-arrow", text: "‹", attrs: { type: "button", "aria-label": "Previous" } });
    var dotsWrap = el("div", { cls: "carousel-dots" });
    var dots = slideGroups.map(function (_, i) {
      var d = el("button", { cls: "carousel-dot", attrs: { type: "button", "aria-label": "Go to slide " + (i + 1) } });
      dotsWrap.appendChild(d);
      return d;
    });
    var nextBtn = el("button", { cls: "carousel-arrow", text: "›", attrs: { type: "button", "aria-label": "Next" } });
    controls.appendChild(prevBtn);
    controls.appendChild(dotsWrap);
    controls.appendChild(nextBtn);
    wrap.appendChild(controls);

    var index = 0;
    function update() {
      track.style.transform = "translateX(-" + (index * 100) + "%)";
      dots.forEach(function (d, i) { d.classList.toggle("active", i === index); });
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === slideGroups.length - 1;
    }
    prevBtn.addEventListener("click", function () { if (index > 0) { index--; update(); } });
    nextBtn.addEventListener("click", function () { if (index < slideGroups.length - 1) { index++; update(); } });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { index = i; update(); }); });
    update();

    return wrap;
  }

  /* ================================================================
     TAB 2 — NATIONAL AMBITION
     ================================================================ */

  function renderNationalShell() {
    var root = document.getElementById("panel-national");
    root.innerHTML = "";

    var intro = el("p", { cls: "lead", text: "Select a country to explore its NDC, LTS and BTR submissions, targets, freight transport actions and key strategy documents." });
    root.appendChild(intro);

    var picker = el("div", { cls: "country-picker" });
    DATA.meta.countries.forEach(function (c) {
      var btn = el("button", {
        cls: "country-btn" + (c === CURRENT_COUNTRY ? " active" : ""),
        attrs: { type: "button", "data-country": c }
      });
      btn.appendChild(document.createTextNode(c));
      if (c === CURRENT_COUNTRY) {
        var activeBg = "#068484"; // neutral background for the selected-country button (not the country's chart color)
        btn.style.background = activeBg;
        btn.style.borderColor = activeBg;
        btn.style.color = readableTextColor(activeBg);
      }
      btn.addEventListener("click", function () {
        CURRENT_COUNTRY = c;
        renderNationalShell();
      });
      picker.appendChild(btn);
    });
    root.appendChild(picker);

    var countryRoot = el("div", { attrs: { id: "country-content" } });
    root.appendChild(countryRoot);
    renderCountry(CURRENT_COUNTRY, countryRoot);
  }

  function docCard(label, valueObj) {
    var card = el("div", { cls: "doc-card" });
    card.appendChild(el("div", { cls: "doc-label", text: label }));
    if (valueObj && valueObj.link) {
      var a = el("a", { cls: "doc-value", text: valueObj.label, attrs: { href: valueObj.link, target: "_blank", rel: "noopener" } });
      card.appendChild(a);
    } else {
      card.appendChild(el("div", { cls: "doc-value missing", text: (valueObj && valueObj.label) || "Not yet submitted" }));
    }
    return card;
  }

  function renderCountry(country, root) {
    root.innerHTML = "";
    var d = DATA.nationalAmbition[country];
    var color = countryColor(country);

    root.appendChild(el("div", { cls: "country-desc", html: formatText(d.description) }));

    /* Documents */
    var docSection = [];
    var strip = el("div", { cls: "doc-strip" });
    d.documents.columns.forEach(function (label, i) {
      strip.appendChild(docCard(label, d.documents.values[i]));
    });
    docSection.push(strip);
    root.appendChild(section("Overview of submitted documents to UNFCCC", docSection));

    /* Targets */
    var tgContent = [];
    var twoCol = el("div", { cls: "two-col" });
    var boxCur = el("div", { cls: "target-box" });
    boxCur.appendChild(el("div", { cls: "target-label", text: "Current economy-wide NDC target" }));
    boxCur.appendChild(el("div", { cls: "target-value", text: d.targets.economyWideCurrent }));
    var boxLong = el("div", { cls: "target-box" });
    boxLong.appendChild(el("div", { cls: "target-label", text: "Current economy-wide long-term target" }));
    boxLong.appendChild(el("div", { cls: "target-value", text: d.targets.economyWideLongTerm }));
    twoCol.appendChild(boxCur);
    twoCol.appendChild(boxLong);
    tgContent.push(twoCol);

    tgContent.push(subheading("Freight transport targets"));
    if (d.targets.freightTable.length) {
      var ftRows = d.targets.freightTable.map(function (r) {
        return tr([td(r.type), td(r.content), td(r.source)]);
      });
      tgContent.push(dataTable(["Target type", "Content", "Source"], ftRows));
    } else {
      tgContent.push(el("div", { cls: "empty-state", text: "No freight-specific transport targets identified in the current NDC or LTS." }));
    }
    tgContent.push(para(d.targets.description));
    root.appendChild(section("Targets", tgContent));

    /* Actions to mitigate */
    var actContent = [];
    var seriesTotal = { name: "Total transport actions", color: "#B7B7B7", values: d.actions.counts.total };
    var seriesFreight = { name: "Freight-relevant actions", color: color, values: d.actions.counts.freight };
    actContent.push(hbarChart(d.actions.counts.categories, [seriesTotal, seriesFreight], {
      title: "Freight-relevant NDC/LTS actions by category",
      valueKey: "values",
      formatter: function (v) { return String(v); }
    }));
    actContent.push(subheading("Example NDC actions"));
    if (d.actions.examples.length) {
      var exList = el("ul", { cls: "bullets action-list" });
      d.actions.examples.forEach(function (e) {
        var li = el("li");
        li.appendChild(el("span", { cls: "action-category", text: e.category }));
        li.appendChild(document.createTextNode(": " + e.text));
        exList.appendChild(li);
      });
      actContent.push(exList);
    } else {
      actContent.push(el("div", { cls: "empty-state", text: "No individually highlighted NDC action examples for " + country + " in the source data." }));
    }
    root.appendChild(section("Actions to mitigate freight transport emissions", actContent));

    /* Adaptation note (Viet Nam only) */
    if (d.actions.adaptationNote) {
      root.appendChild(section("Actions to adapt freight transport to climate change", [el("div", { html: richText(d.actions.adaptationNote) })]));
    }

    /* LTS */
    if (d.lts && d.lts.summary) {
      root.appendChild(section("What does the LTS say on freight transport?", [para(d.lts.summary)]));
    }

    /* Freight transport modes */
    var modeContent = [];
    modeContent.push(heatmapChart(d.modes.categories,
      [{ name: "Across all NDCs", labelSuffix: "out of " + d.modes.ndc.total + " actions", values: d.modes.ndc.values }].concat(
        d.modes.lts ? [{ name: "LTS", labelSuffix: "out of " + d.modes.lts.total + " actions", values: d.modes.lts.values }] : []
      ),
      { title: "Transport modes named in NDC / LTS actions" }
    ));
    modeContent.push(para(d.modes.description));
    root.appendChild(section("Freight transport modes", modeContent));

    /* Progress of climate action (BTR) */
    var btrContent = [];
    if (d.btr && (d.btr.summary || (d.btr.actions && d.btr.actions.length))) {
      if (d.btr.summary) btrContent.push(para(d.btr.summary));
      if (d.btr.actions && d.btr.actions.length) {
        btrContent.push(subheading("Selected actions reported in the BTR"));
        btrContent.push(bulletList(d.btr.actions));
      }
    } else {
      btrContent.push(el("div", { cls: "empty-state", text: country + " has not yet submitted a Biennial Transparency Report." }));
    }
    root.appendChild(section("Progress of climate action", btrContent));

    /* Strategy */
    var stratCard = el("div", { cls: "strategy-card" });
    stratCard.appendChild(el("h4", { text: d.strategy.name }));
    stratCard.appendChild(el("div", { cls: "strategy-text", html: richText(d.strategy.content) }));
    if (d.strategy.link) {
      stratCard.appendChild(el("a", { cls: "strategy-link", text: "View source document →", attrs: { href: d.strategy.link, target: "_blank", rel: "noopener" } }));
    }
    root.appendChild(section("Key freight transport and logistics strategy", [stratCard]));
  }

  /* ================================================================
     TAB 3 — GLOSSARY
     ================================================================ */

  // Escapes text and turns any bare http(s) URL within it into a clickable link.
  function linkify(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(https?:\/\/[^\s)]+)/g, function (url) {
        return '<a href="' + url + '" target="_blank" rel="noopener">' + url + "</a>";
      });
  }

  function glossaryDL(items, withLink) {
    var dl = el("dl", { cls: "glossary-list" });
    items.forEach(function (i) {
      dl.appendChild(el("dt", { text: i.term }));
      var dd = el("dd", { html: formatText(i.definition) });
      if (withLink && i.link) {
        dd.appendChild(el("a", { text: "Learn more →", attrs: { href: i.link, target: "_blank", rel: "noopener" } }));
      }
      dl.appendChild(dd);
    });
    return dl;
  }

  function renderGlossary() {
    var root = document.getElementById("panel-glossary");
    root.innerHTML = "";
    var g = DATA.glossary;

    var introHtml = formatText(g.intro);
    // Fallback: if the intro text still has the bare phrase (i.e. it wasn't
    // already turned into a markdown link), auto-link it using trackerLink.
    if (g.trackerLink && introHtml.indexOf("<a ") === -1) {
      introHtml = introHtml.replace("NDC Transport Tracker",
        '<a href="' + g.trackerLink + '" target="_blank" rel="noopener">NDC Transport Tracker</a>');
    }
    root.appendChild(el("p", { cls: "lead", html: introHtml }));

    var scope = el("div", { cls: "glossary-section" });
    scope.appendChild(el("h3", { text: g.scope.heading }));
    scope.appendChild(para(g.scope.text));
    root.appendChild(scope);

    var proc = el("div", { cls: "glossary-section" });
    proc.appendChild(el("h3", { text: g.submissionProcess.heading }));
    proc.appendChild(glossaryDL(g.submissionProcess.items, true));
    root.appendChild(proc);

    var gens = el("div", { cls: "glossary-section" });
    gens.appendChild(el("h3", { text: g.generations.heading }));
    gens.appendChild(glossaryDL(g.generations.items, false));
    root.appendChild(gens);

    var targets = el("div", { cls: "glossary-section" });
    targets.appendChild(el("h3", { text: g.targetTypes.heading }));
    targets.appendChild(glossaryDL(g.targetTypes.items, false));
    root.appendChild(targets);

    var mit = el("div", { cls: "glossary-section" });
    mit.appendChild(el("h3", { text: g.mitigationMeasures.heading }));
    mit.appendChild(glossaryDL(g.mitigationMeasures.items, false));
    root.appendChild(mit);

    var adapt = el("div", { cls: "glossary-section" });
    adapt.appendChild(el("h3", { text: g.adaptationMeasures.heading }));
    adapt.appendChild(glossaryDL(g.adaptationMeasures.items, false));
    root.appendChild(adapt);

    var more = el("div", { cls: "glossary-section" });
    more.appendChild(el("h3", { text: g.furtherInfo.heading }));
    var ul = el("ul", { cls: "glossary-links" });
    g.furtherInfo.links.forEach(function (l) {
      var li = el("li");
      li.appendChild(el("a", { text: l.term, attrs: { href: l.link, target: "_blank", rel: "noopener" } }));
      ul.appendChild(li);
    });
    more.appendChild(ul);
    root.appendChild(more);

    root.appendChild(el("p", { html: linkify(g.footer) }));
  }

  /* ================================================================
     TABS + BOOT
     ================================================================ */

  function initTabs() {
    var buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
        document.getElementById("panel-" + btn.getAttribute("data-tab")).classList.add("active");
      });
    });
  }

  function applyHeader() {
    document.getElementById("hdr-eyebrow").textContent = DATA.meta.eyebrow;
    document.getElementById("hdr-title").textContent = DATA.meta.title;
    document.getElementById("hdr-subtitle").textContent = DATA.meta.subtitle;
  }

  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function boot(data) {
    DATA = data;
    COLORS = data.meta.countryColors;
    applyHeader();
    initTabs();
    initBackToTop();
    renderOverview();
    renderNationalShell();
    renderGlossary();
  }

  fetch("data/data.json")
    .then(function (res) { return res.json(); })
    .then(boot)
    .catch(function (err) {
      document.getElementById("panel-overview").innerHTML =
        "<p style='color:#c0392b'>Could not load dashboard data (data/data.json). If you're opening this file directly from disk, please serve it via a local web server instead. Details: " + esc(err.message) + "</p>";
      console.error(err);
    });
})();