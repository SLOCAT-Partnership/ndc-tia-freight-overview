# NDC-TIA 2.0 - Dashboard on Freight Transport and Logistics in NDCs and LTS

A static, four-tab dashboard showing how freight transport and logistics are reflected in the NDCs, LTS and BTRs of China, India and Viet Nam, in comparison to the Asia region and global context.

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

An update is planned once Viet Nam releases their new NDC.


## Notes on source data

- Source: NDC Transport Tracker (joint database by GIZ & SLOCAT), data as of 1 September 2026.
