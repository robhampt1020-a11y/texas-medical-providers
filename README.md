# Texas Medical Providers Directory

Netlify-ready website package for `TexasMedicalProviders.com`.

## What changed in this version

This version adds the Texas Medical Providers brand assets:

```text
public/assets/brand/logo-horizontal.png
public/assets/brand/logo-mark.png
public/assets/brand/favicon.png
public/assets/brand/favicon-32.png
public/assets/brand/favicon-192.png
public/assets/brand/apple-touch-icon.png
public/assets/brand/og-image.png
public/favicon.ico
```

It also updates the header, hero panel, footer, favicon tags, Open Graph image, and color system to match the red heart/heartbeat brand.

## Important security note

This package is safe to upload to a public GitHub repository because it does not contain private provider referral emails.

Do not commit provider referral emails to GitHub. Store them in Netlify environment variables only.

## Correct repository structure

Upload these files at the root of the GitHub repo:

```text
public/
netlify/
scripts/
source/
docs/
README.md
netlify.toml
package.json
.env.example
.gitignore
```

## Netlify build settings

```text
Build command: npm run check
Publish directory: public
Functions directory: netlify/functions
```

The `netlify.toml` file already includes these settings.

## Request Provider form

The form posts to:

```text
/.netlify/functions/request-provider
```

The function reads provider routing from this Netlify environment variable:

```text
PROVIDER_ROUTING_JSON_BASE64
```

Email delivery uses Resend and requires:

```text
RESEND_API_KEY
FROM_EMAIL
TMP_COPY_EMAIL
SEND_REQUESTER_CONFIRMATION
PROVIDER_ROUTING_JSON_BASE64
```

Until those variables are set, the site will deploy, but the form will return an email-configuration error instead of silently losing requests.
