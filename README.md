# KP Pudding – KP පුඩිං 🍮

Official website for **KP Pudding** – *KP පුඩිං – ඔබේ රසවත් තේරීම*.

Static site (HTML + CSS + vanilla JS, no build step), ready for **GitHub Pages**.

## Features
- **Pudding Cup – Rs. 150** shown on the product card, popup, cart totals, WhatsApp message and a spinning hero price sticker.
- **Admin panel** at `admin.html` – edit products (name, Sinhala name, price, image, stock, show/hide, featured, order), the event (headline, city, dates, hours, poster) and contact details, then **Publish**.
- Animations: preloader, orchestrated hero entrance, floating caramel bubbles & sparkles, ticker, 3D tilt cards, jelly wobble, fly-to-cart, confetti on order, caramel drips, scroll progress bar, back-to-top ring, button shine/ripple. All disabled automatically for users who prefer reduced motion.
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
data/site.json – editable content (products, prices, event, contact)
admin.html, js/admin.js, css/admin.css – admin panel
```

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Publish on GitHub Pages
Settings → Pages → *Deploy from a branch* → pick the branch with these files, folder `/ (root)` → Save.
Site URL: `https://sourceconnect213-pixel.github.io/Kp-pudding-/`

## Admin panel (how it works)
The site is static (GitHub Pages), so content lives in **`data/site.json`** in this repository.
`admin.html` signs in with your own **GitHub fine-grained token** and saves changes by committing that file
(and any uploaded images in `assets/uploads/`) to the **`gh-pages`** branch. The live site updates 1–2 minutes later.

Create the token once: <https://github.com/settings/personal-access-tokens/new>
→ Repository access: *Only select repositories* → `Kp-pudding-`
→ Repository permissions: **Contents → Read and write** → Generate → paste it into the admin login.
No token is stored in the code; without a valid token nobody can change anything.

Orders are not stored on a server – they arrive as WhatsApp messages to the number set in the admin panel.

## Editing tips
- Use the admin panel for products, prices, event and contact details.
- Code changes: push to the `gh-pages` branch (pull first – the admin panel commits there too).
