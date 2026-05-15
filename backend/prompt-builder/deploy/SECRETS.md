# prompt-builder · secrets handling

## Where they live

| Surface | Location | Mode | Owner |
| --- | --- | --- | --- |
| Production | `/etc/prompt-builder/secrets.env` on the VPS (`76.13.179.86`) | `0600` | `root:root` |
| Repo template | `backend/prompt-builder/deploy/secrets.env.example` | tracked, all values empty / placeholder | — |
| Systemd unit | `/etc/systemd/system/prompt-builder.service` | references the file via `EnvironmentFile=` | — |

The unit file contains **zero plaintext secrets**. Previously every key
was set via `Environment=` lines in the unit + drop-ins under
`.service.d/*.conf` — those files were mode `0644` (world-readable),
which meant any process on the box could read them via
`systemctl show prompt-builder` or just `cat`. The sealed `.env` flips
that to root-only.

The old drop-ins are kept as backup at:
`/etc/systemd/system/prompt-builder.service.d/.disabled-2026-05-15/`
Remove them when you're confident the new file is stable.

## Rotation playbook

For any single key (e.g. you suspect `OPENROUTER_API_KEY` leaked):

```bash
ssh -i ~/.ssh/dc1_hostinger root@76.13.179.86
sudoedit /etc/prompt-builder/secrets.env       # edit only the one line
systemctl restart prompt-builder
sleep 5 && systemctl is-active prompt-builder  # must print 'active'
curl -sS http://localhost:8200/clients/active  # must return JSON, not empty
```

If the post-restart probe fails, the key probably has a typo — revert
via:

```bash
cp /etc/systemd/system/prompt-builder.service.bak.<timestamp> \
   /etc/systemd/system/prompt-builder.service
systemctl daemon-reload && systemctl restart prompt-builder
```

For a wholesale rotation (e.g. after a suspected VPS compromise), do
all of:

1. Rotate `DATABASE_URL` password — change in postgres + the file.
   This is the highest blast-radius secret on the box.
2. Rotate every API key one at a time, restarting between.
3. Re-issue Kapso webhook signing secrets.
4. Re-generate any DCP renter key.
5. Force-revoke the old keys at each provider before swapping in the
   new ones (most providers let you keep N+1 active for ~5 min so the
   restart doesn't drop traffic).

## Audit

```bash
# Anyone else been able to read the file?
ls -la /etc/prompt-builder/secrets.env       # -rw------- root root
getfacl /etc/prompt-builder/secrets.env      # no ACL grants other reads

# Watch future reads (recommended for production)
auditctl -w /etc/prompt-builder/secrets.env -p rwxa -k pb_secrets
ausearch -k pb_secrets

# Confirm running process inherited only from the file
PID=$(pgrep -f "uvicorn app:app" | head -1)
strings /proc/$PID/environ 2>/dev/null | grep -E "API_KEY|TOKEN|DATABASE"
```

## What NOT to do

- ❌ Don't commit real values to `secrets.env.example`.
- ❌ Don't `Environment=` back into the systemd unit. Everything goes
  through the file or nothing.
- ❌ Don't `chmod 644` it "just to debug". A `sudoedit` works as root.
- ❌ Don't export the values to your shell + run python directly for
  ad-hoc testing — copy what you need into a local `.env` file, run
  python with `dotenv`, and delete the local file after.
