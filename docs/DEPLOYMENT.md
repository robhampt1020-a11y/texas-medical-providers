# Deployment Notes

## Clean deploy order

1. Delete old files from the GitHub repo or create a new repo.
2. Upload this package's contents to the repo root.
3. Confirm `netlify/functions/providerRouting.private.js` does not exist.
4. Let Netlify deploy from GitHub.
5. Add environment variables in Netlify.
6. Test the temporary Netlify URL.
7. Connect `TexasMedicalProviders.com`.
8. Redirect `tmproviders.com` after the primary domain works.

## Do not upload private routing emails

The provider routing map belongs in Netlify environment variables, not in GitHub.
