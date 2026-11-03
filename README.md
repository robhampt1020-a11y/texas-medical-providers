# Texas Medical Providers

Provider information is maintained in `source/providers.json`. Filters and public profile files are generated automatically when Netlify runs `npm run check`.

Start with [the provider management guide](docs/PROVIDER-MANAGEMENT.md). The CSV in source is a historical import only; do not use it for edits.

Run `npm run check` before publishing. Run `npm test` to check the provider validation. Private referral destinations belong only in Netlify environment variables.
