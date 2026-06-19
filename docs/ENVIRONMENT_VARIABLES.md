# Netlify Environment Variables

Set these in Netlify:

```text
RESEND_API_KEY
FROM_EMAIL
TMP_COPY_EMAIL
SEND_REQUESTER_CONFIRMATION
PROVIDER_ROUTING_JSON_BASE64
```

Recommended values:

```text
FROM_EMAIL=Texas Medical Providers <no-reply@texasmedicalproviders.com>
TMP_COPY_EMAIL=Info@TexasMedicalProviders.com
SEND_REQUESTER_CONFIRMATION=true
```

Use the separate private environment-values file generated with this package for `PROVIDER_ROUTING_JSON_BASE64`.

Do not add that private file to GitHub.
