# Bravery Game

A Next.js project with TypeScript, shadcn/ui, Tailwind CSS, and i18n support.

## Features

- ⚡ Next.js 14 with App Router
- 🎨 shadcn/ui components
- 🌐 i18n support (English & Persian)
- 📱 Mobile-first responsive design
- 🎨 Tailwind CSS with green-500 as primary color
- 🔷 TypeScript

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (redirects to /home)
│   ├── home/              # Sample /home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── providers/        # Context providers
├── lib/                  # Utility functions
│   ├── i18n.ts          # i18n configuration
│   └── utils.ts         # Utility functions
└── locales/            # Translation files
    ├── en/
    └── fa/
```

## i18n Usage

All text strings should use translation keys. Example:

```tsx
import { useTranslation } from "react-i18next"

function MyComponent() {
  const { t } = useTranslation("common")
  return <h1>{t("home.title")}</h1>
}
```

## Design Philosophy

The design is mobile-first. On desktop, the layout maintains the same width as mobile and is centered on the screen.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

