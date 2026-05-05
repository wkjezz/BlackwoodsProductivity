# BlackwoodsProductivity

This repository contains a scaffolded React app using Vite and Tailwind CSS.

Quick start:

1. Install dependencies:

```bash
npm install
```

2. Run the dev server:

```bash
npm run dev
```

Files added:

- [package.json](package.json)
- [vite.config.js](vite.config.js)
- [tailwind.config.cjs](tailwind.config.cjs)
- [postcss.config.cjs](postcss.config.cjs)
- [index.html](index.html)
- [src/main.jsx](src/main.jsx)
- [src/App.jsx](src/App.jsx)
- [src/index.css](src/index.css)

Logo

Place your logo file at `src/assets/BW_LOGO_WITH_THORNS.png`. The app displays this image above the title.

Server and storage

Start the lightweight server that stores roster data to `server/data/roster.json`:

```bash
npm run start:server
```

The frontend expects the API at `http://localhost:3001/api/roster` when running locally.

For Vercel deployment, the same Express app is exposed as a serverless function under `/api`, and data storage switches to Vercel KV when `VERCEL` is set. That keeps the backend hosted with the app instead of relying on a separate database server.

