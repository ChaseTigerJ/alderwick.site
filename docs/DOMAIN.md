# Connect www.playalderwick.com

Repository: `ChaseTigerJ/alderwick.site`.

GitHub Pages uses **GitHub Actions**, with **Custom domain** set to `www.playalderwick.com`. The repository name does not determine the DNS destination. A CNAME value is a hostname, not a repository name or URL.

## Squarespace DNS

Use these records:

| Host | Type | Value |
| --- | --- | --- |
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | chasetigerj.github.io |

The `www` CNAME must point directly to `chasetigerj.github.io`, **without a repository name, path, or `https://` prefix**. Do not use `alderwick.site`: DNS treats that as a separate domain, regardless of this repository’s name.

Replace only conflicting web-hosting records for `@` and `www`. Keep mail and other service records. Set the custom domain in GitHub before changing DNS.

## Validate and enable HTTPS

1. Save the DNS records in Squarespace. Cached DNS records may take up to 24 hours to update.
2. In this repository’s **Settings → Pages**, use **Check again** if shown and wait for successful DNS validation.
3. Wait for GitHub to issue the certificate, then enable **Enforce HTTPS** when available. GitHub may initially show an `http://` address while HTTPS is unavailable; “Your site is live” does not prove the DNS records are correct.
4. Check `https://www.playalderwick.com/` and `https://playalderwick.com/`. With both record sets configured, GitHub redirects the apex domain to the configured `www` primary domain.

A CNAME file is not required for this Actions deployment; the repository Pages setting controls the custom domain. Renaming the repository is not required for Squarespace or a custom CNAME. GitHub also recommends verifying domain ownership in account Pages settings.

Reference: [GitHub’s custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
