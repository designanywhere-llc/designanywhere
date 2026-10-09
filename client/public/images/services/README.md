# Service card photos

Product Design, 3D Modeling & CAD, and Machine & Tooling play a muted clip first, then cycle the real-work photos in that folder. Prototype & DFM, PDM/PLM, and Manufacturing Solutions Consultation still cycle their photos on hover (desktop). On touch devices those three cards stay on the first photo.

Stock `01.jpg` placeholders were removed from every card. Do not put a stock photo back in the rotation.

## Folders (service ids)

| Folder | Card | Motion |
| --- | --- | --- |
| `product-design/` | Product Design | `videos/product-design.mp4` |
| `prototype-dfm/` | Prototype & DFM | photos only |
| `machine-tooling/` | Machine & Tooling Design | `videos/machine-tooling.mp4` |
| `cad-3d-modeling/` | 3D Modeling & CAD Services | `videos/cad-3d-modeling.mp4` |
| `pdm-plm/` | PDM/PLM Creation | photos only |
| `manufacturing-consultation/` | Manufacturing Solutions Consultation | photos only |

The hero loops `videos/hero-logo-sting.mp4` (mobile: `videos/hero-logo-sting-mobile.mp4`). The Our Services intro loops `videos/services-intro.mp4`. Those two slots have no real-work stills, so they do not cycle photos.

## Filename convention

Real-work JPEGs already in each folder:

```
02.jpg
03.jpg
04.jpg
```

`02.jpg` is the first still after a clip ends, and the resting photo on the three cards that have no clip. The file list lives in `client/src/lib/motionMedia.ts` (`realWorkFiles`). Adding another photo means appending it there.

## Suggested specs

- Landscape, roughly **1600×900** (or similar 16∶9). Cards crop with `object-cover` at ~208px tall.
- JPEG, quality ~80–85. Aim for **under ~400 KB** per file so cycling stays snappy.
- Avoid huge phone originals (several MB); compress before dropping them in.

GitHub Pages serves these from `client/public`, so paths stay valid with the `publicUrl()` / `BASE_PATH` prefix.
