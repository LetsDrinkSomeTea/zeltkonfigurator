# GitHub-Workflows

Die beiden Workflows liegen hier nur zwischengelagert: Die Automatisierung, die dieses Repo
aufgebaut hat, darf keine Dateien unter `.github/workflows/` anlegen. Einmalig von Hand
verschieben und pushen:

```bash
mkdir -p .github && git mv ci/workflows .github/workflows && git rm ci/README.md
```

```bash
git commit -m "Enable CI and release workflows" && git push
```

- `ci.yml` prüft jeden Pull Request und jeden Push auf `main` (Format, Lint, Typen, Tests, Build).
- `release.yml` baut bei einem Tag `vX.Y.Z` das Installationspaket und legt einen GitHub-Release
  mit `zeltkonfigurator-X.Y.Z.zip` an. Der Tag muss zur Version in `package.json` passen.

Einen Release auslösen: Version in `package.json` erhöhen, committen, dann den passenden Tag
setzen und pushen (Beispiel für Version 0.1.0):

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```
