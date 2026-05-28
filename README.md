# Blog Factory Release

This repository is the deployment and release repository for Blog Factory.

## Downloads

Download the latest release from the **Releases** page:

- Windows: `BlogFactory-Windows.zip`
- Mac: `BlogFactory-Mac.zip`

After downloading or running the app, leave a confirmation record:

- [Download / run confirmation](https://github.com/kwanggeun386-a11y/blogpost-release/issues/new?template=download-confirmation.yml)

Release download counts are summarized by the `Release Download Report` workflow. See [download tracking guide](docs/download-tracking.md).

## Local Run

```bash
npm ci
npm ci --prefix client
npm run build --prefix client
npm start
```

Open:

```text
http://127.0.0.1:3001
```

API keys and writing data are stored only on each user's local computer.
