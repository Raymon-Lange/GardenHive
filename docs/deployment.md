# GardenHive — Production Deployment

This document covers the full production setup for GardenHive on a Proxmox LXC
container, including domain registration (GoDaddy), DNS and SSL proxy
(Cloudflare), origin SSL (Let's Encrypt), Tailscale for secure remote access,
and the Docker Compose stack.

---

## Infrastructure Overview

| Layer | Technology |
|---|---|
| Hypervisor | Proxmox VE |
| Container | LXC — Ubuntu |
| Web server / proxy | nginx (inside Docker frontend image) |
| App runtime | Docker Compose |
| Database | MongoDB 7 (Docker volume) |
| Domain registrar | GoDaddy |
| DNS / SSL proxy | Cloudflare (proxied, Full strict) |
| Origin SSL | Let's Encrypt (Certbot standalone) |
| Remote access | Tailscale |
| Domain | fire-hive.com |

---

## 1. Proxmox LXC Setup

### Finding and accessing the container with `pct`

All `pct` commands run on the **Proxmox host** (not inside the container).

```bash
# List all containers — find the GardenHive one by name or note the VMID
pct list

# Example output:
# VMID  Status   Lock  Name
# 101   running        gardenhive

# Check container status
pct status 101

# Enter the container (root shell, no SSH needed)
pct enter 101

# Start / stop the container
pct start 101
pct stop 101

# Reboot the container
pct reboot 101
```

Once inside the container (`pct enter 101`) all subsequent commands run as root
in the Ubuntu environment. Exit back to the Proxmox host with `exit`.

### Create the container

Create an Ubuntu LXC container in Proxmox with:

- **RAM**: 1–2 GB minimum
- **Disk**: 20 GB minimum
- **Network**: bridged, static IP or DHCP reservation
- **Unprivileged container**: yes (Docker requires nesting enabled)

Enable nesting for Docker support:

```
Proxmox UI → Container → Options → Features → Nesting: ✓
```

Inside the LXC, install Docker and create a deploy user:

```bash
# Update and install Docker
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Deploy user
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
```

---

## 2. Domain — GoDaddy + Cloudflare

### Traffic flow

```
User → Cloudflare (TLS) → origin nginx on LXC (TLS, Let's Encrypt)
```

Cloudflare sits in front of the server. It terminates the user-facing TLS
connection with its own certificate, then makes a second encrypted connection
to nginx using the Let's Encrypt cert. This is **Full (strict)** mode —
Cloudflare validates the origin cert, so a valid cert on the server is required.

### Step 1 — Add the site to Cloudflare

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → enter `fire-hive.com`
2. Choose the **Free** plan (or higher)
3. Cloudflare will scan existing DNS records — review and confirm

### Step 2 — Point GoDaddy nameservers to Cloudflare

Cloudflare will show you two nameservers, e.g.:

```
aria.ns.cloudflare.com
bob.ns.cloudflare.com
```

In GoDaddy:

1. **My Products** → find `fire-hive.com` → **DNS**
2. Scroll to **Nameservers** → **Change** → **Enter my own nameservers**
3. Replace the GoDaddy nameservers with the two Cloudflare ones
4. Save — propagation takes a few minutes to 24 hours

### Step 3 — Add DNS records in Cloudflare

In the Cloudflare dashboard → **DNS** → **Records**:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `fire-hive.com` | `<server-ip>` | Proxied (orange cloud) |
| A | `www` | `<server-ip>` | Proxied (orange cloud) |

The orange cloud means traffic flows through Cloudflare — the real server IP
is hidden and Cloudflare provides DDoS protection and CDN caching.

### Step 4 — Set SSL/TLS mode to Full (strict)

In Cloudflare → **SSL/TLS** → **Overview** → select **Full (strict)**

This tells Cloudflare to validate the Let's Encrypt certificate on the origin
server. Without a valid cert on nginx, the site will show a 526 error.

### Step 5 — Enable HTTPS redirect

In Cloudflare → **SSL/TLS** → **Edge Certificates** → turn on
**Always Use HTTPS**

This redirects any `http://` requests to `https://` at the Cloudflare edge
(nginx also does its own redirect, so this adds a second layer).

---

## 3. SSL — Let's Encrypt (Certbot standalone)

The origin server needs a valid SSL certificate because Cloudflare is set to
**Full (strict)** mode — it validates the cert before forwarding traffic.

Certbot's standalone mode spins up a temporary HTTP server on port 80 to
complete the ACME challenge. Two things must be true first:

1. The Docker stack is **stopped** so port 80 is free
2. Cloudflare DNS is **active** (nameservers propagated) — Certbot must be able
   to resolve `fire-hive.com` to the server IP

> **Note:** Temporarily set the A record to **DNS only** (grey cloud) in
> Cloudflare before running Certbot. Cloudflare proxied mode can interfere with
> the ACME HTTP-01 challenge. Switch back to proxied after the cert is issued.

```bash
# Install Certbot
apt install -y certbot

# Issue the certificate (port 80 must be free)
certbot certonly --standalone -d fire-hive.com -d www.fire-hive.com
```

Certificates are written to `/etc/letsencrypt/live/fire-hive.com/`.

### Copy certs to the project directory

The Docker Compose file mounts `./certs/` into the nginx container. Copy the
certs there so nginx can read them without running as root:

```bash
mkdir -p /home/deploy/gardenhive/certs

cp /etc/letsencrypt/live/fire-hive.com/fullchain.pem \
   /home/deploy/gardenhive/certs/fullchain.crt
cp /etc/letsencrypt/live/fire-hive.com/privkey.pem \
   /home/deploy/gardenhive/certs/privkey.key

chown deploy:deploy /home/deploy/gardenhive/certs/*
chmod 600 /home/deploy/gardenhive/certs/*
```

### Certificate renewal

Let's Encrypt certificates expire after 90 days. Automate renewal with a cron
job that runs as root, stops the stack, renews, copies the new certs, then
restarts:

```bash
# /etc/cron.d/certbot-gardenhive
0 3 * * 1 root \
  docker compose -f /home/deploy/gardenhive/docker-compose.yml down && \
  certbot renew --quiet && \
  cp /etc/letsencrypt/live/fire-hive.com/fullchain.pem /home/deploy/gardenhive/certs/fullchain.crt && \
  cp /etc/letsencrypt/live/fire-hive.com/privkey.pem   /home/deploy/gardenhive/certs/privkey.key && \
  chown deploy:deploy /home/deploy/gardenhive/certs/* && \
  chmod 600 /home/deploy/gardenhive/certs/* && \
  docker compose -f /home/deploy/gardenhive/docker-compose.yml up -d
```

---

## 4. Tailscale — Secure Remote Access

Tailscale is installed on the LXC so you can SSH into the server securely
without exposing port 22 to the public internet.

### Install Tailscale on the LXC

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### Authenticate and bring up the node

```bash
tailscale up
# Follow the URL printed in the terminal to authenticate via the Tailscale admin panel
```

### Verify

```bash
tailscale status        # shows the node's Tailscale IP (100.x.x.x)
tailscale ip -4         # print just the IPv4 address
```

### SSH via Tailscale

Once the node is up, SSH using the Tailscale IP from any device on your Tailnet:

```bash
ssh deploy@<tailscale-ip>
```

Port 22 does **not** need to be open on the public firewall — SSH traffic goes
through the encrypted Tailscale overlay network.

### Auto-start on boot

Tailscale is managed by systemd and starts automatically:

```bash
systemctl enable --now tailscaled
```

---

## 5. Environment Variables

Create `/home/deploy/gardenhive/.env`:

```bash
JWT_SECRET=<strong-random-secret-min-32-chars>
CORS_ORIGIN=https://fire-hive.com
SEED_DATA=false
```

Generate a strong secret:

```bash
openssl rand -hex 32
```

---

## 6. Deploy the Stack

```bash
# As the deploy user
su - deploy
mkdir -p ~/gardenhive && cd ~/gardenhive

# Copy docker-compose.yml from the repo (or clone the repo here)
# Ensure .env and certs/ are in place, then:
docker compose up -d
```

Services started:

| Service | Image | Ports (host) |
|---|---|---|
| mongo | mongo:7 | internal only |
| backend | ghcr.io/raymon-lange/gardenhive-backend:latest | internal only |
| frontend | ghcr.io/raymon-lange/gardenhive-frontend:latest | 80, 443 |

The nginx config inside the frontend image handles:
- HTTP → HTTPS redirect (port 80 → 443)
- TLS termination (TLS 1.2 / 1.3)
- `/api/*` proxied to `backend:5000`
- React SPA fallback (`try_files $uri /index.html`)

---

## 7. Updating the App

Pull the latest images and recreate the containers:

```bash
cd /home/deploy/gardenhive
docker compose pull
docker compose up -d
```

### Reseed the plant library

Only needed after a fresh deploy or if seed data changes:

```bash
SEED_DATA=true docker compose up -d --force-recreate backend
# Wait for the seed to complete (docker compose logs -f backend)
docker compose up -d --force-recreate backend  # restore SEED_DATA=false
```

---

## 8. Verify

```bash
# All three containers running
docker compose ps

# HTTPS working
curl -I https://fire-hive.com

# API responding
curl https://fire-hive.com/api/plants/public | head -c 200

# Certificate expiry — check the origin cert directly (bypasses Cloudflare)
# The browser will show a Cloudflare cert; this checks the Let's Encrypt cert on nginx
echo | openssl s_client -connect <server-ip>:443 -servername fire-hive.com 2>/dev/null \
  | openssl x509 -noout -dates
```
