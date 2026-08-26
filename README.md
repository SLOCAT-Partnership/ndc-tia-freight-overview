# NDC-TIA 2.0 - Dashboard on Freight Transport and Logistics in NDCs and LTS

A static, three-tab dashboard showing how freight transport and logistics are reflected in the NDCs, LTS and BTRs of China, India and Viet Nam, in comparison to the Asia region and global context.

Built for the NDC Transport Initiative for Asia (NDC-TIA), based on data compiled by SLOCAT with technical support from GIZ and WRI.

## Structure

```
dashboard/
├── index.html          # page shell + tab markup (loads app.js)
├── assets/
│   ├── styles.css       # all styling (brand colors, layout, charts)
│   ├── app.js            # renders all three tabs from data/data.json
│   └── img/               # logos + the freight-terms word cloud image
└── data/
    └── data.json          # ALL dashboard content and figures
```

**All text, numbers and links shown on the dashboard live in [`data/data.json`](data/data.json).**
`index.html` / `app.js` never need to change to update content — just edit the JSON and refresh.

## Editing the content

`data.json` is grouped to mirror the three tabs:

- `meta` — page title, brand colors, and the color assigned to each country/region (used consistently across every chart, chip and button)
- `intro` — the shared masthead intro shown at the top of the Overview tab (partner logos, "about this overview")
- `overview` — everything on the **Overview** tab: freight-actions word cloud, UNFCCC submissions, targets, mitigation actions + chart, adaptation actions + chart, global initiatives
- `nationalAmbition` — one object per country (`China`, `India`, `Viet Nam`) powering the **National Ambition** tab's country switcher. If a country hasn't submitted a document yet (e.g. Viet Nam's LTS/BTR), set its `link` to `null` and use a label like `"Not yet submitted"` — the dashboard automatically renders that as a muted "missing" state.
- `glossary` — the static **Glossary** tab (definitions + further-reading links)

Percentages in chart series are stored as decimals (e.g. `0.147` → rendered as `14.7%`); counts are stored as plain integers alongside them so both can be shown.

After editing `data.json`, validate it's well-formed JSON before publishing (e.g. paste it into any JSON validator, or run `python -m json.tool data/data.json` from a terminal).

## Running locally

Because the page loads `data/data.json` via `fetch()`, opening `index.html` directly from disk will fail in most browsers (CORS blocks `file://` fetches). Serve the folder over HTTP instead, for example:

```bash
cd dashboard
python -m http.server 8420
```

Then open `http://localhost:8420`.



## Notes on source data

- Source: NDC Transport Tracker (GIZ & SLOCAT), NDC-TIA freight overview workbook, data as of 10 August 2026.
- "Vietnam" has been streamlined to "Viet Nam" throughout the dashboard, per project convention.
- Brand colors were kept as used in the source workbook: section bands `#3FAEAB`, table headers `#068484`, and country colors Asia `#4285F4` (blue), China `#EA4335` (red), India `#FBBC04` (yellow), Viet Nam `#34A853` (green) — the same palette used in the workbook's charts.
