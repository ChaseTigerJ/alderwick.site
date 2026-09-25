# Connect playalderwick.com

Repository: `ChaseTigerJ/alderwick-site`.

1. In GitHub repository **Settings → Pages**, select **GitHub Actions** as the source.
2. Once the domain has been purchased, set **Custom domain** to `playalderwick.com` and save. GitHub recommends verifying domain ownership in account Pages settings first.
3. In Squarespace's DNS settings, replace only conflicting web-hosting records for `@` and `www`. Keep mail and other service records.

| Host | Type | Value |
| --- | --- | --- |
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | chasetigerj.github.io |

4. Wait for DNS validation and the certificate, then enable **Enforce HTTPS** in GitHub Pages. DNS propagation can take up to 24 hours.
5. Check both `https://playalderwick.com` and `https://www.playalderwick.com`. GitHub redirects the secondary host to the configured primary domain.

The `www` CNAME points to the GitHub account hostname, **without** `/alderwick-site`. Set the custom domain in GitHub before changing DNS. A CNAME file alone is not effective for an Actions deployment; the repository Pages setting is required.

Reference: [GitHub’s current custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
