# Service card photos

Each homepage service card cycles through the numbered images in its folder on hover (desktop). On touch/mobile the first image stays visible.

To swap in real job photos, **replace the files in place**. No code change is needed as long as names stay the same.

## Folders (service ids)

| Folder | Card |
| --- | --- |
| `product-design/` | Product Design |
| `prototype-dfm/` | Prototype & DFM |
| `machine-tooling/` | Machine & Tooling Design |
| `cad-3d-modeling/` | 3D Modeling & CAD Services |
| `pdm-plm/` | PDM/PLM Creation |
| `manufacturing-consultation/` | Manufacturing Solutions Consultation |

## Filename convention

Use zero-padded JPEG names:

```
01.jpg
02.jpg
03.jpg
04.jpg
```

`01.jpg` is the default (shown before hover, and on mobile).

PNG and `.jpeg` also work if you rename them to `01.jpg` … `04.jpg` (keep the `.jpg` extension in the filename the site already references). Adding a fifth photo requires bumping the count in `serviceImageUrls("<id>", 5)` in `client/src/pages/home.tsx`.

## Suggested specs

- Landscape, roughly **1600×900** (or similar 16∶9). Cards crop with `object-cover` at ~208px tall.
- JPEG, quality ~80–85. Aim for **under ~400 KB** per file so hover cycling stays snappy.
- Avoid huge phone originals (several MB); compress before dropping them in.

Current files are **placeholders** redistributed from existing stock and `attached_assets` job photos. Overwrite them whenever real shots are ready.

GitHub Pages serves these from `client/public`, so paths stay valid with the `publicUrl()` / `BASE_PATH` prefix.
