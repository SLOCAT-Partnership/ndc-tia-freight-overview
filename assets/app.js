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
  // **word** -> bold, [label](url) -> link (url can be an absolute https:// link
  // or a relative path within the site, e.g. to a downloadable asset). Plain text
  // with none of that syntax passes through unchanged, so it's always safe to call.
  function formatText(str) {
    return esc(str)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\(([^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
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
    var table = el("table", { cls: "heatmap-table" + (opts.equalColumns ? " heatmap-table-equal" : "") });
    var thead = el("thead");
    var htr = el("tr");
    htr.appendChild(el("th", { text: "" }));
    series.forEach(function (s) {
      var label = s.name + (s.labelSuffix ? " (" + s.labelSuffix + ")" : "");
      if (s.icon) {
        // Name and icon stack on their own lines rather than sitting inline,
        // so the icon reads as its own visual element under the label.
        var th = el("th", {});
        th.appendChild(el("div", { cls: "heatmap-col-name", text: label }));
        th.appendChild(el("div", { cls: "heatmap-col-icon", text: s.icon }));
        htr.appendChild(th);
      } else {
        htr.appendChild(el("th", { text: label }));
      }
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
  // `emptyCountries` lets a country appear as a toggle option even when it has
  // no rows — e.g. Viet Nam, which has no sectoral targets — so its absence
  // reads as a documented fact rather than an oversight. Shape: [{ name, message }].
  function countryToggleTable(rows, columns, cellsFn, emptyCountries) {
    var countries = [];
    rows.forEach(function (r) { if (countries.indexOf(r.country) === -1) countries.push(r.country); });
    (emptyCountries || []).forEach(function (e) { countries.push(e.name); });

    var wrap = el("div", { cls: "toggle-table" });
    var toggle = el("div", { cls: "mini-toggle" });
    var tableSlot = el("div");

    function show(country) {
      Array.prototype.forEach.call(toggle.children, function (b) {
        b.classList.toggle("active", b.getAttribute("data-value") === country);
      });
      tableSlot.innerHTML = "";
      var empty = (emptyCountries || []).filter(function (e) { return e.name === country; })[0];
      if (empty) {
        var msgCell = el("td", { cls: "empty-state", text: empty.message, attrs: { colspan: String(columns.length) } });
        tableSlot.appendChild(dataTable(columns, [tr([msgCell])]));
        return;
      }
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
     TAB 0 — ABOUT THIS DASHBOARD
     ================================================================ */

  function renderAbout() {
    var root = document.getElementById("panel-about");
    root.innerHTML = "";
    var a = DATA.about;
    var bg = a.background;

    var bgBlock = el("div", { cls: "glossary-section" });
    bgBlock.appendChild(el("h3", { text: bg.heading }));
    bg.paragraphs.forEach(function (p) { bgBlock.appendChild(para(p)); });

    var implBlock = el("div", { cls: "implemented-by" });
    implBlock.appendChild(el("div", { cls: "label", text: bg.implementedByLabel }));
    var logos = el("div", { cls: "partner-logos" });
    bg.partnerLogos.forEach(function (l) {
      var img = el("img", { attrs: { src: l.src, alt: l.alt } });
      if (l.link) {
        var link = el("a", { attrs: { href: l.link, target: "_blank", rel: "noopener" } });
        link.appendChild(img);
        logos.appendChild(link);
      } else {
        logos.appendChild(img);
      }
    });
    implBlock.appendChild(logos);
    bgBlock.appendChild(implBlock);
    root.appendChild(bgBlock);

    a.sections.forEach(function (s) {
      var hasLinks = s.links && s.links.length;
      var hasText = s.text && s.text.trim();
      if (!hasLinks && !hasText) return; // nothing to show yet
      var blk = el("div", { cls: "glossary-section" });
      blk.appendChild(el("h3", { text: s.heading }));
      if (hasLinks) {
        var ul = el("ul", { cls: "glossary-links" });
        s.links.forEach(function (l) {
          var li = el("li");
          li.appendChild(el("a", { text: l.term, attrs: { href: l.link, target: "_blank", rel: "noopener" } }));
          ul.appendChild(li);
        });
        blk.appendChild(ul);
      }
      if (hasText) {
        // Placeholder sections (e.g. Download the data) render muted/italic to
        // signal the content is a stand-in, not final.
        blk.appendChild(s.placeholder ? el("div", { cls: "empty-state", text: s.text }) : para(s.text));
      }
      root.appendChild(blk);
    });
  }

  // Single-row partner-logo strip appended to the end of the Overview, National
  // Ambition and Glossary tabs (the About tab already shows these prominently
  // near the top, so it isn't repeated there).
  function sheetFooterLogos(container) {
    var logos = DATA.about.background.partnerLogos;
    var row = el("div", { cls: "sheet-footer-logos" });
    logos.forEach(function (l) {
      var img = el("img", { attrs: { src: l.src, alt: l.alt } });
      if (l.link) {
        var link = el("a", { attrs: { href: l.link, target: "_blank", rel: "noopener" } });
        link.appendChild(img);
        row.appendChild(link);
      } else {
        row.appendChild(img);
      }
    });
    container.appendChild(row);
  }

  // Featured-report callout box (WRI's "Visioning to Implementation", 2023),
  // appended at the end of the Overview and National Ambition sections.
  function reportBox(contentNodes) {
    var ref = DATA.wriReport;
    var box = el("div", { cls: "report-box" });
    box.appendChild(el("div", { cls: "report-box-label", text: "Featured report" }));
    box.appendChild(el("h4", { cls: "report-box-title", text: ref.title }));
    contentNodes.forEach(function (n) { if (n) box.appendChild(n); });
    box.appendChild(el("a", { cls: "report-box-link", text: "Read the report here →", attrs: { href: ref.link, target: "_blank", rel: "noopener" } }));
    return box;
  }

  // Collapsible list of every freight-related action identified in a country's NDCs and LTS,
  // grouped by document generation. Collapsed by default given the volume of quotes involved.
  function freightActionsDisclosure(fa, countryName) {
    var details = el("details", { cls: "actions-disclosure" });
    var summary = el("summary", { cls: "actions-disclosure-summary" });
    summary.appendChild(document.createTextNode("View all " + fa.total + " freight-related actions in " + countryName + "'s NDCs and LTS"));
    details.appendChild(summary);

    var body = el("div", { cls: "actions-disclosure-body" });
    fa.groups.forEach(function (g) {
      var group = el("div", { cls: "actions-group" });
      var heading = el("h4", { cls: "actions-group-heading" });
      heading.appendChild(document.createTextNode(g.document + " "));
      heading.appendChild(el("span", { cls: "actions-group-count", text: "(" + g.items.length + ")" }));
      group.appendChild(heading);

      var ul = el("ul", { cls: "actions-list" });
      g.items.forEach(function (it) {
        var li = el("li", { cls: "actions-item" });
        if (it.category) li.appendChild(el("span", { cls: "actions-item-tag", text: it.category }));
        li.appendChild(el("div", { cls: "actions-item-text", html: richText(it.quote) }));
        if (it.page) li.appendChild(el("span", { cls: "actions-item-page", text: "p. " + it.page }));
        ul.appendChild(li);
      });
      group.appendChild(ul);
      body.appendChild(group);
    });
    details.appendChild(body);
    return details;
  }

  // Cornerstone external-source callout (e.g. WRI report statistics), styled
  // distinctly from SLOCAT-authored content so readers can tell the two apart.
  var TRUCK_ICON_SVG =
    '<svg class="external-box-icon" viewBox="0 0 100 66" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      '<rect x="36" y="18" width="48" height="35" rx="2" fill="currentColor"/>' +
      '<path d="M36 30 H23 L8 43 V53 H36 Z" fill="currentColor"/>' +
      '<path d="M31.5 33 H24.5 L13.5 43 H31.5 Z" fill="#fff" opacity="0.62"/>' +
      '<path d="M36 24 H80" stroke="#fff" stroke-width="2" opacity="0.28"/>' +
      '<rect x="8" y="46" width="4" height="4" rx="1" fill="#fff" opacity="0.7"/>' +
      '<rect x="12" y="49" width="72" height="5" rx="1" fill="currentColor"/>' +
      '<rect x="83" y="48" width="8" height="3" rx="1" fill="currentColor"/>' +
      '<circle cx="92" cy="49" r="3.5" fill="currentColor" opacity="0.78"/>' +
      '<circle cx="96" cy="45" r="4.5" fill="currentColor" opacity="0.5"/>' +
      '<circle cx="99" cy="40" r="5.5" fill="currentColor" opacity="0.28"/>' +
      '<circle cx="23" cy="53" r="8" fill="currentColor"/>' +
      '<circle cx="23" cy="53" r="3.2" fill="#fff" opacity="0.65"/>' +
      '<circle cx="69" cy="53" r="8" fill="currentColor"/>' +
      '<circle cx="69" cy="53" r="3.2" fill="#fff" opacity="0.65"/>' +
    '</svg>';

  function externalInsightBox(text) {
    var ref = DATA.wriReport;
    var box = el("div", { cls: "external-box" });
    box.appendChild(el("div", { cls: "external-box-icon-wrap", html: TRUCK_ICON_SVG }));
    var content = el("div", { cls: "external-box-content" });
    content.appendChild(el("div", { cls: "external-box-label", text: "Situation of freight transport and logistics" }));
    content.appendChild(el("p", { html: formatText(text) }));
    var source = el("span", { cls: "external-box-source" });
    source.appendChild(document.createTextNode("Source: "));
    source.appendChild(el("a", { text: ref.title, attrs: { href: ref.link, target: "_blank", rel: "noopener" } }));
    source.appendChild(document.createTextNode(" (WRI, 2023)"));
    content.appendChild(source);
    box.appendChild(content);
    return box;
  }

  /* ================================================================
     TAB 1 — OVERVIEW
     ================================================================ */

  function renderOverview() {
    var root = document.getElementById("panel-overview");
    root.innerHTML = "";

    var ov = DATA.overview;

    /* -- Key findings -- */
    if (ov.keyFindings) {
      var kfBox = el("div", { cls: "country-desc" });
      kfBox.appendChild(bulletList(ov.keyFindings.bullets));
      root.appendChild(section(ov.keyFindings.heading, [kfBox]));
    }

    /* -- Overview of UNFCCC submissions -- */
    var sub = ov.submissions;
    var subContent = [];
    if (sub.highlight) subContent.push(el("div", { cls: "stat-callout", html: formatText(sub.highlight) }));
    subContent.push(para(sub.intro));
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
    // Charts and the country table lead here, with the "NDC submissions" /
    // "LTS submissions" narrative reading as commentary on them afterwards —
    // an intentional exception to the usual text-before-tables rule elsewhere.
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
    // Text precedes each sub-topic's table: the economy-wide commentary and
    // all freight-target commentary/examples now sit above their tables.
    var tg = ov.targets;
    var tgContent = [];
    if (tg.highlight) tgContent.push(el("div", { cls: "stat-callout", html: formatText(tg.highlight) }));
    tgContent.push(para(tg.intro));
    tgContent.push(para(tg.economyWide.note));
    tgContent.push(subheading(tg.economyWide.heading));
    var ewRows = tg.economyWide.rows.map(function (r) {
      var cells = [td(r.country, "country-cell")];
      r.values.forEach(function (v) { cells.push(td(v)); });
      return tr(cells);
    });
    ewRows.push(tr([td("Source", "country-cell")].concat(tg.economyWide.source.map(function (s) { return td(s); }))));
    tgContent.push(dataTable(["Country"].concat(tg.economyWide.columns), ewRows));

    tgContent.push(subheading(tg.freight.heading));
    tgContent.push(para(tg.freight.intro));
    tgContent.push(para(tg.freight.listIntro));
    tgContent.push(countryToggleTable(tg.freight.table.rows, ["Target type", "Target content relevant for freight", "Source"],
      function (r) { return tr([td(r.type), td(r.content), td(r.source)]); },
      [{ name: "Viet Nam", message: tg.freight.vietnamNote }]
    ));
    tgContent.push(para(tg.freight.regionalExamplesIntro));
    var exList = el("div", { cls: "example-list example-list-fit example-list-lg" });
    tg.freight.regionalExamples.forEach(function (e) {
      exList.appendChild(exampleCard(e.country, e.content));
    });
    tgContent.push(exList);
    tgContent.push(el("p", { cls: "footnote", text: tg.freight.footnote }));
    root.appendChild(section(tg.heading, tgContent));

    /* -- Freight actions mentioned in NDCs -- */
    var fa = ov.freightActions;
    var faContent = [];
    if (fa.stat) faContent.push(el("div", { cls: "stat-callout", html: formatText(fa.stat) }));
    faContent.push(para(fa.intro));
    var fig = el("figure", { cls: "figure figure-narrow" });
    fig.appendChild(el("img", { attrs: { src: fa.image, alt: fa.imageAlt } }));
    fig.appendChild(el("figcaption", { text: "Most frequently used terms in freight-related climate actions across Asia." }));
    faContent.push(fig);
    root.appendChild(section(fa.heading, faContent));

    /* -- Mitigation -- */
    var mi = ov.mitigation;
    var miContent = [];
    if (mi.highlight) miContent.push(el("div", { cls: "stat-callout", html: formatText(mi.highlight) }));
    miContent.push(para(mi.intro), el("div", { cls: "insight-label", text: mi.insight }), bulletList(mi.bullets));
    miContent.push(hbarChart(mi.chart.categories, mi.chart.series, { title: mi.chartTitle, valueKey: "share", formatter: pct }));
    miContent.push(subheading(mi.spotlight.heading));
    var spotCards = mi.spotlight.examples.map(function (e) { return exampleCard(e.country, e.content); });
    miContent.push(carousel([spotCards.slice(0, 4), spotCards.slice(4)]));
    root.appendChild(section(mi.heading, miContent));

    /* -- Adaptation -- */
    var ad = ov.adaptation;
    var adContent = [];
    if (ad.highlight) adContent.push(el("div", { cls: "stat-callout", html: formatText(ad.highlight) }));
    adContent.push(para(ad.intro), bulletList(ad.vietnamBullets), para(ad.comparisonIntro));
    adContent.push(hbarChart(ad.chart.categories, ad.chart.series, { title: ad.chartTitle, valueKey: "share", formatter: pct, footnotes: ad.chart.footnotes }));
    adContent.push(subheading(ad.examplesHeading));
    var adList = el("div", { cls: "example-list example-list-fit example-list-lg" });
    ad.examples.forEach(function (e) { adList.appendChild(exampleCard(e.country, e.content)); });
    adContent.push(adList);
    root.appendChild(section(ad.heading, adContent));

    /* -- Global initiatives -- */
    var gi = ov.initiatives;
    var giContent = [];
    if (gi.highlight) giContent.push(el("div", { cls: "stat-callout", html: formatText(gi.highlight) }));
    giContent.push(para(gi.intro));
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

    /* -- Featured report -- */
    var rh = ov.reportHighlight;
    root.appendChild(reportBox(rh.paragraphs.map(function (p) { return para(p); })));

    sheetFooterLogos(root);
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
    picker.appendChild(el("span", { cls: "select-country-label", text: "Select country:" }));
    DATA.meta.countries.forEach(function (c) {
      var btn = el("button", {
        cls: "country-btn" + (c === CURRENT_COUNTRY ? " active" : ""),
        attrs: { type: "button", "data-country": c }
      });
      var code = COUNTRY_FLAGS[c];
      if (code) {
        btn.appendChild(el("img", {
          cls: "flag-icon",
          attrs: { src: "assets/img/flags/" + code + ".svg", alt: "" }
        }));
      }
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

    sheetFooterLogos(root);
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

    // description can be a single string (rendered as a paragraph) or an array
    // of strings (rendered as bullets) — trialling bullets per-country before
    // rolling out everywhere.
    var descBox = el("div", { cls: "country-desc" });
    if (Array.isArray(d.description)) {
      var descList = el("ul", { cls: "bullets" });
      d.description.forEach(function (line) { descList.appendChild(el("li", { html: formatText(line) })); });
      descBox.appendChild(descList);
    } else {
      descBox.innerHTML = formatText(d.description);
    }
    root.appendChild(descBox);

    if (d.externalInsight) root.appendChild(externalInsightBox(d.externalInsight));

    /* Documents */
    var docSection = [];
    if (d.documents.highlight) docSection.push(el("div", { cls: "stat-callout", html: formatText(d.documents.highlight) }));
    var strip = el("div", { cls: "doc-strip" });
    d.documents.columns.forEach(function (label, i) {
      strip.appendChild(docCard(label, d.documents.values[i]));
    });
    docSection.push(strip);
    root.appendChild(section("Overview of submitted documents to UNFCCC", docSection));

    /* Targets */
    var tgContent = [];
    if (d.targets.highlight) tgContent.push(el("div", { cls: "stat-callout", html: formatText(d.targets.highlight) }));
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

    tgContent.push(para(d.targets.description));
    tgContent.push(subheading("Freight transport targets"));
    if (d.targets.freightTable.length) {
      var ftRows = d.targets.freightTable.map(function (r) {
        return tr([td(r.type), td(r.content), td(r.source)]);
      });
      tgContent.push(dataTable(["Target type", "Content", "Source"], ftRows));
    } else {
      tgContent.push(el("div", { cls: "empty-state", text: "No freight-specific transport targets identified in the current NDC or LTS." }));
    }
    root.appendChild(section("Targets", tgContent));

    /* Actions to mitigate */
    var actContent = [];
    if (d.actions.highlight) actContent.push(el("div", { cls: "stat-callout", html: formatText(d.actions.highlight) }));
    if (d.actions.narrative) actContent.push(para(d.actions.narrative));
    var seriesTotal = { name: "Total transport actions", color: "#B7B7B7", values: d.actions.counts.total };
    var seriesFreight = { name: "Freight-relevant actions", color: color, values: d.actions.counts.freight };
    actContent.push(hbarChart(d.actions.counts.categories, [seriesTotal, seriesFreight], {
      title: "Freight-relevant " + (d.lts && d.lts.summary ? "NDC/LTS" : "NDC") + " actions by category",
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
    if (d.freightActions) {
      actContent.push(freightActionsDisclosure(d.freightActions, country));
    }

    root.appendChild(section("Actions to mitigate freight transport emissions", actContent));

    /* Adaptation note (Viet Nam only) */
    if (d.actions.adaptationNote) {
      root.appendChild(section("Actions to adapt freight transport to climate change", [el("div", { html: richText(d.actions.adaptationNote) })]));
    }

    /* LTS */
    if (d.lts && d.lts.summary) {
      var ltsContent = [];
      if (d.lts.highlight) ltsContent.push(el("div", { cls: "stat-callout", html: formatText(d.lts.highlight) }));
      ltsContent.push(para(d.lts.summary));
      root.appendChild(section("What does the LTS say on freight transport?", ltsContent));
    }

    /* Freight transport modes */
    // Transposed vs. a plain lookup: modes become columns (in a fixed order,
    // "Not explicitly defined" pinned last since it isn't a real mode), and
    // NDC/LTS become rows — the heatmapChart() helper is orientation-agnostic,
    // so this is just a matter of which array is passed as rows vs. columns.
    var modeContent = [];
    if (d.modes.highlight) modeContent.push(el("div", { cls: "stat-callout", html: formatText(d.modes.highlight) }));
    modeContent.push(para(d.modes.description));
    var MODE_EMOJI = { "Road transport": "🚚", "Rail": "🚆", "Water transport": "🚢", "Air transport": "✈️" };
    var modeOrder = d.modes.categories.filter(function (c) { return c !== "Not explicitly defined"; });
    if (d.modes.categories.indexOf("Not explicitly defined") !== -1) modeOrder.push("Not explicitly defined");
    var modeSeries = modeOrder.map(function (modeName) {
      var idx = d.modes.categories.indexOf(modeName);
      var values = [d.modes.ndc.values[idx]];
      if (d.modes.lts) values.push(d.modes.lts.values[idx]);
      return { name: modeName, icon: MODE_EMOJI[modeName], values: values };
    });
    var modeRows = ["Across all NDCs (out of " + d.modes.ndc.total + " actions)"].concat(
      d.modes.lts ? ["LTS (out of " + d.modes.lts.total + " actions)"] : []
    );
    modeContent.push(heatmapChart(modeRows, modeSeries, { title: "Transport modes named in NDC and LTS actions (several modes per action possible)", equalColumns: true }));
    root.appendChild(section("Freight transport modes", modeContent));

    /* Progress of climate action (BTR) */
    var btrContent = [];
    if (d.btr && d.btr.highlight) btrContent.push(el("div", { cls: "stat-callout", html: formatText(d.btr.highlight) }));
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
    var stratContent = [];
    if (d.strategy.highlight) stratContent.push(el("div", { cls: "stat-callout", html: formatText(d.strategy.highlight) }));
    var stratCard = el("div", { cls: "strategy-card" });
    stratCard.appendChild(el("h4", { text: d.strategy.name }));
    stratCard.appendChild(el("div", { cls: "strategy-text", html: richText(d.strategy.content) }));
    if (d.strategy.link) {
      stratCard.appendChild(el("a", { cls: "strategy-link", text: "View source document →", attrs: { href: d.strategy.link, target: "_blank", rel: "noopener" } }));
    }
    stratContent.push(stratCard);
    root.appendChild(section("Key freight transport and logistics strategy", stratContent));

    /* Featured report */
    var rh = d.reportHighlight;
    root.appendChild(reportBox([para(rh.intro), bulletList(rh.bullets)]));
  }

  /* ================================================================
     TAB 3 — GLOSSARY
     ================================================================ */

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

    sheetFooterLogos(root);
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
    renderAbout();
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