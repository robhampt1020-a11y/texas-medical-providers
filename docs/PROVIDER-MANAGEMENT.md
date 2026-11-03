# Adding or updating a provider

Edit **source/providers.json**. This is the only provider information file you maintain. You can edit it on GitHub with the pencil button, or ask Codex to make the change. Changes still go through the usual GitHub and Netlify publication process.

Each object is one provider. Copy an existing object, add a comma between entries, then change its values. Keep the surrounding square brackets. Use double quotes around text. Cities and services are lists; primarySpecialty is one specialty.

```json
{
  "name": "Example Care",
  "slug": "example-care",
  "primarySpecialty": "Orthopedics",
  "services": ["MD Consults", "Pain Management"],
  "cities": ["Austin"],
  "publicPhone": "",
  "phoneHref": "",
  "website": "https://example.com",
  "description": "A short factual description of the provider and its services.",
  "image": "assets/providers/example-care.png",
  "imageAlt": "Example Care branded banner"
}
```

1. Choose a unique slug using lowercase letters and hyphens. Keep existing slugs unchanged: directory links and private request routing depend on them.
2. Fill in confirmed provider information. Reuse existing service names such as `MD Consults` and `Pain Management` for consistent filters.
3. Upload a banner to **public/assets/providers/** and put its relative path in `image`. Use the existing 3:1 banner proportions. If a banner is not ready, omit both `image` and `imageAlt`: the directory shows a placeholder and the homepage skips that provider until artwork is available.
4. For a public phone number, fill in both `publicPhone` (displayed number) and `phoneHref` (international format, such as `+12105550100`). Both may be blank. Website may also be blank.
5. Optional `otherSpecialties` is a list of additional confirmed specialties for the profile. The homepage displays only `primarySpecialty`.
6. Before publishing a new provider, configure private request routing in Netlify for that exact slug. See the routing section below.
7. Run `npm run check` locally, or allow the Netlify build to validate the update. Invalid data stops publication and the previous deployed version stays live.
8. Check the new provider in the directory, search filters, homepage rotation, and request form after publication.

The build creates **public/data/providers.public.js** and **public/data/provider-profiles.js**. Do not edit those generated files. New cities, specialties, and services appear in filters automatically. Providers with banners automatically join the homepage rotation and all providers participate in the directory's four-day spotlight schedule. Adding/removing/reordering providers can change which spotlight is selected.

## Private request routing

Provider contact destinations are private and must never go in providers.json, banners, GitHub, or this guide. The existing Netlify function reads **PROVIDER_ROUTING_JSON_BASE64** (or its existing JSON alternative). Its decoded object maps each provider slug to an object with `name`, `email`, and `primarySpecialty`. Update the existing map with the new slug; preserve all existing entries. Keep credentials and real destination addresses in Netlify only.

A listing without a matching routing entry cannot send a provider-specific request. The public build cannot verify private Netlify values; this is a required onboarding step. General requests continue to use TMP's configured inbox. No private routing or email delivery behavior is changed by this provider-management update.

## Updating and removing

Edit an existing object's values to update it. Keep its slug stable. To remove a listing, remove that object and update any homepage stories in `public/data/updates.js` that link to it. Retain private routing if old requests or links still require it; review that separately.

## Troubleshooting

The build names the provider and field needing attention. It rejects duplicate names/slugs, missing descriptions or main specialties, empty city/service lists, invalid phone/website formats, missing banner files, unknown fields, and private email addresses. Correct the source and rebuild. You do not need to maintain filter counts or provider counts manually.

## Adding private routing without replacing the original map

For new providers, Netlify also supports **PROVIDER_ROUTING_ADDITIONS_JSON**. Its value is a JSON object keyed by provider slug, using the same name, email, and primarySpecialty fields. Store real addresses only in Netlify. Add entries to this supplemental map while preserving any existing entries. The original routing map takes precedence for slugs already configured there. Configure the supplemental value for production and any preview contexts you intend to use.
