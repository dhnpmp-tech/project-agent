# prompt-builder (local mirror)

This directory mirrors `/opt/prompt-builder/` on VPS `76.13.179.86` for git-tracked TDD.

## Deploy
Backend runs on the VPS as `prompt-builder.service` (FastAPI on :8200). After local edits + tests pass, deploy with:

```bash
scp <changed-file> root@76.13.179.86:/opt/prompt-builder/
ssh root@76.13.179.86 'systemctl restart prompt-builder.service'
```

## Run tests
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python3 -m pytest tests/ -v
```
