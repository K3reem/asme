# ASME UJ Registration Website

A lightweight, English-only recruitment website for the ASME Student Section at the University of Jordan. It includes a Home / Register page, an About Us page, the eight specified form fields, client-side validation, a Google Apps Script endpoint, and GitHub Pages deployment configuration.

## Project files

- `index.html`: homepage and registration form.
- `about.html`: About Us page.
- `assets/styles.css`: responsive styling, CSS-based 3D-inspired visuals, animations, and reduced-motion support.
- `assets/app.js`: mobile navigation, validation, submission states, and confirmation handling.
- `assets/config.js`: public Apps Script endpoint configuration.
- `assets/favicon.svg`: editable text-free favicon.
- `Code.gs`: Google Apps Script backend. Configure this separately in script.google.com.
- `.github/workflows/pages.yml`: GitHub Pages build/deploy workflow.

## 1. Connect Google Sheets

1. Create or choose a Google Sheet. Keep the spreadsheet private.
2. Copy the spreadsheet ID from its URL. For a URL like `https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`, copy the text between `/d/` and `/edit`.
3. Visit [Google Apps Script](https://script.google.com/) and create a project.
4. Replace the starter code in `Code.gs` with the complete `Code.gs` file from this project.
5. Set `SPREADSHEET_ID` to the ID you copied. Set `SHEET_NAME` to the worksheet name you want, such as `Applications`. The script creates the worksheet and headers if the worksheet does not exist.
6. Save the project.
7. Select `doPost` and run it only if prompted for authorization is appropriate; the normal first submission will also trigger authorization. Approve the requested spreadsheet access under the account that owns or can edit the sheet.
8. Click **Deploy → New deployment**. Select **Web app**.
9. Set **Execute as** to **Me**. Set access to the broadest anonymous/public option available for your Google account and organization, commonly **Anyone**. Organization policies may restrict anonymous access. Do not make the spreadsheet itself public.
10. Deploy and copy the web app URL ending in `/exec`.
11. Open `assets/config.js` and replace `YOUR_APPS_SCRIPT_WEB_APP_URL` with the real `/exec` URL. Keep the URL in quotes.
12. Commit and publish the website again.

If you change the Apps Script code later, create a new version and update the existing deployment to that version. The `/exec` URL usually remains the same for an updated deployment.

### Data handling and endpoint limits

The Apps Script web app receives public form submissions and writes accepted rows into your private spreadsheet. Anyone with access to the public endpoint may attempt submissions. The code checks required fields and allowed selections, uses a honeypot and nonce-based duplicate check, and prefixes formula-like text. These measures reduce simple abuse but are not full bot protection or identity verification. Review incoming responses and restrict or disable the deployment if abuse occurs.

The website posts to the Apps Script response inside a hidden iframe. The script sends a nonce-matched `postMessage` only after the row is appended. The frontend displays success only when it receives that matching success response. If the response is blocked or delayed, the website reports that it could not confirm the submission. Check the spreadsheet before asking a student to submit again, because a saved row and a lost browser response are still possible.

## 2. Run locally

Because this is a static site, you do not need a build step. Open `index.html` in a browser for a visual preview. For a more realistic local test, run a simple static server from the project folder, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. Until you configure `assets/config.js`, the form intentionally refuses to submit and shows a configuration message.

## 3. Publish on GitHub Pages

1. Create a new GitHub repository, for example `asme-uj-registration`.
2. Upload or push all project files, including the `.github/workflows/pages.yml` workflow.
3. In the repository, open **Settings → Pages**.
4. Set the build/deployment source to **GitHub Actions**, if GitHub asks.
5. Open the **Actions** tab and wait for the Pages workflow to complete.
6. Open the published URL shown in the workflow or in **Settings → Pages**.
7. Test the homepage and About Us navigation on desktop and mobile.

The included workflow publishes the static files from the repository root. No Node build is required. Do not commit private credentials, applicant data, or the spreadsheet ID to the repository.

## 4. Pre-launch test checklist

- [ ] Replace any branding placeholders with approved ASME assets, if available.
- [ ] Configure the spreadsheet ID and worksheet name in the private Apps Script project.
- [ ] Deploy Apps Script as a web app with appropriate anonymous access.
- [ ] Put the deployed `/exec` URL in `assets/config.js`.
- [ ] Publish or redeploy the GitHub Pages site.
- [ ] Submit a real test application using an email/phone you control.
- [ ] Verify the new row appears with all nine columns in the correct order.
- [ ] Test each required field empty and invalid email/phone values.
- [ ] Test each team and year option, and confirm Notes may be blank.
- [ ] Check a failed network submission and verify the form retains entered answers.
- [ ] Check the spreadsheet remains private.
- [ ] Remove the test application from the spreadsheet before recruitment begins, if appropriate.

## 5. Editing the site

- Wording and form fields: `index.html` and `about.html`.
- Colors, layout, responsive design, and animations: `assets/styles.css`.
- Form validation and submission behavior: `assets/app.js`.
- Public submission URL: `assets/config.js`.
- Spreadsheet ID, worksheet name, server validation, and stored column order: `Code.gs` in Apps Script, not in the public repository.

## Testing status

The project is provided as a complete static implementation. The real Google Sheets integration is **not connected until you configure and deploy your own Apps Script endpoint**. A live write to your spreadsheet, anonymous access policy, and final GitHub Pages deployment must be verified using your own accounts.
