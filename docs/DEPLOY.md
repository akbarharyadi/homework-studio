# Deployment — Homework Studio

How the app ships to the server at **`haryadi@192.168.1.13`** and is served at
**https://homeworkstudio.akbarharyadi.com** through a Cloudflare Tunnel.

## The shape of it

```
  push to main ─► GitHub Actions
                    ├─ CI            build + vet + test (cloud runner)
                    ├─ Docs          re-seed the app, regenerate screenshots + PDFs, commit
                    └─ Deploy        self-hosted runner ON the server → docker compose up
                                          │
   Internet ─► Cloudflare ═══ tunnel ═════╪══► frontend :3000 ──/api/──► backend :8080 ──► Postgres
                                     (cloudflared, no open ports)
```

The server is on a home LAN that GitHub's cloud runners can't reach, so CD is
**pull-based**: a self-hosted runner *on the server* picks up the deploy job. Inbound
web traffic comes through a **Cloudflare Tunnel** (`cloudflared`), so nothing is
port-forwarded and no firewall hole is opened.

Secrets never touch git: the AI API key lives in a GitHub Actions secret and is written
to `docker/.env` at deploy time; `docker/.env` and the tunnel credentials stay on the
server only.

---

## One-time setup

### 1. GitHub secret — the AI API key

In the repo: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `AI_API_KEY` | your AI provider's API key (the one in your local `docker/.env`) |

(Or from your machine, where `docker/.env` has the key:
`gh secret set AI_API_KEY < <(grep '^AI_API_KEY=' docker/.env | cut -d= -f2-)`.)

### 2. Server — Docker

SSH in (`ssh haryadi@192.168.1.13`) and, if Docker isn't there yet:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"        # then log out/in so the group applies
docker compose version                 # sanity check
```

### 3. Server — the self-hosted deploy runner

In the repo: **Settings → Actions → Runners → New self-hosted runner → Linux**, then
run the commands it shows on the server. Give it the label this repo's deploy job
expects (`homework`):

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# (download URL + version come from the GitHub "New runner" page)
curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.XXX.X/actions-runner-linux-x64-2.XXX.X.tar.gz
tar xzf runner.tar.gz
./config.sh --url https://github.com/<owner>/homework-studio \
            --token <RUNNER_TOKEN_FROM_GITHUB> \
            --labels homework --name hs-server --unattended
sudo ./svc.sh install && sudo ./svc.sh start     # run it as a service
```

The deploy job is `runs-on: [self-hosted, homework]`, so it only runs on this box.

### 4. Server — Cloudflare Tunnel

```bash
# Install cloudflared (Debian/Ubuntu)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authenticate (opens a browser link — pick the akbarharyadi.com zone)
cloudflared tunnel login

# Create the tunnel and point the subdomain at it
cloudflared tunnel create homeworkstudio
cloudflared tunnel route dns homeworkstudio homeworkstudio.akbarharyadi.com

# Config: copy the template and drop in the tunnel id it printed
mkdir -p ~/.cloudflared
cp <repo>/deploy/cloudflared/config.example.yml ~/.cloudflared/config.yml
#   edit ~/.cloudflared/config.yml: replace <TUNNEL_ID> (twice)

# Run it as a service
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

`config.example.yml` forwards `homeworkstudio.akbarharyadi.com` → `http://localhost:3000`
(the frontend container). The frontend proxies `/api/` to the backend, so only port
3000 is exposed to the tunnel.

---

## Deploying

- **Automatic:** every push to `main` runs CI, then the deploy job on the server does
  `docker compose … up -d --build`.
- **Manual / first run (with a fresh seed):** repo → **Actions → Deploy → Run workflow**,
  tick **seed**. This loads the demo dataset (destroys current data), so use it only
  for the first deploy or a deliberate reset.

Check it: `https://homeworkstudio.akbarharyadi.com/health` → `{"status":"ok"}`, then
log in with the demo accounts (password `demo1234`).

---

## Notes

- **No SSH keys are needed for CD** — the runner authenticates to GitHub itself. SSH is
  only for this one-time server setup.
- **Data persists across deploys**: Postgres and uploads live in named Docker volumes;
  a normal deploy rebuilds the app containers without touching them. Only the **seed**
  step resets data.
- **Rolling back:** re-run the deploy job on an earlier commit, or on the server
  `git -C <repo> checkout <sha> && docker compose -f docker/docker-compose.yml up -d --build`.
- **Logs:** `docker compose -f docker/docker-compose.yml logs -f backend` and
  `sudo journalctl -u cloudflared -f`.
