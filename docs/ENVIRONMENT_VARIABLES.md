# Netlify Environment Variables

Set these in Netlify:

```text
RESEND_API_KEY
FROM_EMAIL
TMP_COPY_EMAIL
SEND_REQUESTER_CONFIRMATION
PROVIDER_ROUTING_JSON_BASE64
```

Recommended notes:

```text
FROM_EMAIL should use a verified sending domain in Resend.
TMP_COPY_EMAIL should be the TMP inbox that receives request copies.
SEND_REQUESTER_CONFIRMATION can be true or false.
```

This repo also sets `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml` so Netlify does not fail when public TMP email addresses appear in the website footer or docs.

Use the separate private environment-values file generated with this package for `PROVIDER_ROUTING_JSON_BASE64`.

Do not add that private file to GitHub.
