# KP Pudding – KP පුඩිං 🍮

Official website for **KP Pudding** – *KP පුඩිං – ඔබේ රසවත් තේරීම*.

Static site (HTML + CSS + vanilla JS, no build step), ready for **GitHub Pages**.

## Features
- Hero: **අපි එනවා ගම්පහ නගරයට** – November 10–15, 1PM–8PM, with a live status pill + countdown
  (Sri Lanka time; switches automatically to "Live now", "Tomorrow 1PM" and "Thank you Gampaha").
- Products: Pudding Cups, Pudding Packs, Party Orders – quick-view modal and "Add to Order".
- Cart (header icon) + order form → opens a ready-made **WhatsApp** message to `076 90 90 90 9`.
- About, KP Pudding Tour (Anuradhapura, Kurunegala, Gampaha), video ads, how-to-order, contact.
- Search, customer-help menu, mobile menu, floating WhatsApp button, responsive for phone/tablet/desktop.

## Structure
```
index.html
css/style.css
js/main.js
assets/img/    – logo, ambassador, truck, products, posters, icons
assets/video/  – 5 web-optimised (H.264/AAC) videos
```

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Publish on GitHub Pages
Settings → Pages → *Deploy from a branch* → pick the branch with these files, folder `/ (root)` → Save.
Site URL: `https://sourceconnect213-pixel.github.io/Kp-pudding-/`

## Editing tips
- Phone / WhatsApp number: search `94769090909` and `076 90 90 90 9`.
- Event dates/times: `EV` object in `js/main.js` and the hero text in `index.html`.
