# Sanding Machine — ROI Tool

Standalone Next.js site hosting the Sanding Machine ROI calculator.

- **Production domain:** `sanding-machine-roi.nichomachines.com`
- **Stack:** Next.js 16 App Router · React 19 · Tailwind CSS v4 · Resend

## Local development

```bash
npm install
cp .env.example .env.local   # fill in RESEND_API_KEY etc. as needed
npm run dev
```

The calculator is served from `/` and posts submissions to `/api/roi/drilling-cell`.

## Environment variables

See `.env.example`. In production these are managed in Vercel.

## Notes

- Without `RESEND_API_KEY` the API logs the submission and returns 200, so dev/preview deployments keep working.
- This project was extracted from the `nicholaisen.website` repo as a standalone Vercel deployment.
