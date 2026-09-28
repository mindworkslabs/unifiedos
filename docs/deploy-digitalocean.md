# Deploying to a DigitalOcean droplet

The whole stack runs on one droplet with Docker Compose. There are three containers:

| Container | What it does |
|---|---|
| `app` | The Next.js server. Database migrations run automatically every time it starts. |
| `db` | PostgreSQL 16, with its data in a Docker volume |
| `caddy` | The web server in front. It gets and renews HTTPS certificates from Let's Encrypt automatically. |

## 1. Create the droplet

1. In DigitalOcean choose **Create → Droplets** and pick **Ubuntu 24.04 LTS**.
2. Pick a size. **Basic, 1 GB RAM / 1 vCPU ($6/mo)** is enough. The setup script adds 2 GB of swap so the first build doesn't run out of memory; 2 GB RAM builds faster.
3. Add your **SSH key** and create the droplet. Note its IP address.
4. Optional: tick **Backups** for weekly whole-droplet snapshots, on top of the nightly database dumps described below.

## 2. Point your domain at it (optional, but needed for HTTPS)

At your DNS provider, create an **A record**, e.g. `termlink.example.com`, pointing to the droplet's IP. If DigitalOcean manages your DNS, do this under **Networking → Domains**.

Wait until `ping termlink.example.com` answers from the droplet's IP. Caddy can only get a certificate once DNS resolves.

No domain yet? Skip this step. The site will then run over plain HTTP on the droplet's IP address.

## 3. Get the code onto the droplet

```bash
ssh root@YOUR_DROPLET_IP
apt-get update && apt-get install -y git
git clone https://github.com/mindworkslabs/unifiedos.git /opt/unifiedos
cd /opt/unifiedos
git checkout claude/fallout-unified-os-u0gvf9   # or main, once this is merged
```

The repository is private, so `git clone` needs credentials. Either option works:
- **HTTPS with a token.** Create a fine-grained personal access token with read access to this repo, and use it as the password when git asks.
- **Deploy key.** Run `ssh-keygen -t ed25519` on the droplet and add `~/.ssh/id_ed25519.pub` under the repo's **Settings → Deploy keys** (read-only). Then clone with `git clone git@github.com:mindworkslabs/unifiedos.git /opt/unifiedos`.

## 4. Run the setup script

With a domain:
```bash
sudo ./deploy/setup-droplet.sh termlink.example.com
```
Without a domain (plain HTTP on the IP address):
```bash
sudo ./deploy/setup-droplet.sh
```

The script:
1. installs Docker;
2. adds swap on small droplets;
3. opens the firewall for SSH, HTTP and HTTPS;
4. writes `/opt/unifiedos/.env` with a random database password and session secret;
5. builds and starts everything.

The first build takes 3–6 minutes on a 1 GB droplet. When it finishes, open `https://termlink.example.com` (or `http://YOUR_DROPLET_IP`) and register your first terminal.

Check it's healthy:
```bash
docker compose ps                  # all three services "Up", app "(healthy)"
curl -s localhost/api/health       # {"status":"ok"}  (use https://your-domain with a domain)
```

## Everyday operations

All commands run from `/opt/unifiedos`.

| Task | Command |
|---|---|
| Deploy the latest code | `sudo ./deploy/update.sh` |
| View logs | `docker compose logs -f app` (or `caddy`, `db`) |
| Restart | `docker compose restart app` |
| Stop / start everything | `docker compose down` / `docker compose up -d` |
| Back up the database now | `sudo ./deploy/backup.sh` (writes `backups/unifiedos-DATE.sql.gz` and keeps the newest 14) |
| Nightly backups at 03:00 | `sudo crontab -e`, then add `0 3 * * * /opt/unifiedos/deploy/backup.sh` |
| Restore a backup | `gunzip -c backups/FILE.sql.gz \| docker compose exec -T db psql -U unifiedos unifiedos` |
| Open a SQL shell | `docker compose exec db psql -U unifiedos unifiedos` |

Backups stay on the droplet. To keep copies elsewhere, sync `backups/` to DigitalOcean Spaces with `s3cmd` or `rclone`, or rely on droplet Backups.

## Adding a domain later

1. Point the domain's A record at the droplet (step 2).
2. Edit `/opt/unifiedos/.env` and set:
   ```
   DOMAIN=termlink.example.com
   COOKIE_SECURE=true
   ```
3. Run `docker compose up -d`. Caddy fetches the certificate and HTTP starts redirecting to HTTPS.

## Settings (`.env`)

| Variable | Meaning |
|---|---|
| `DOMAIN` | The site's hostname, or `:80` for plain HTTP by IP |
| `COOKIE_SECURE` | `true` for HTTPS. Must be `false` on plain HTTP, or logins won't stick. |
| `POSTGRES_PASSWORD` | The database password (generated). Don't change it after the first start: the database keeps its original password. |
| `SESSION_SECRET` | Signs login cookies (generated). Changing it logs everyone out and ends intruder sessions. |

Keep `.env` private. It is git-ignored and readable only by root.

## Troubleshooting

- **Build killed / "JavaScript heap out of memory".** Check the swap exists with `swapon --show`, or resize to a 2 GB droplet.
- **HTTPS not working.** Run `docker compose logs caddy`. The usual causes are DNS not yet pointing at the droplet, or ports 80/443 blocked. Check with `ufw status` and the DigitalOcean cloud firewall, if you use one.
- **Can't stay logged in over plain HTTP.** Set `COOKIE_SECURE=false` in `.env`, then run `docker compose up -d`.
- **App restarting.** Run `docker compose logs app`. A migration error or a database connection error is printed first.
