# GardenHive — Production Deployment

This document covers the full production setup for GardenHive on a Proxmox LXC
container, including domain DNS, SSL via Let's Encrypt, Tailscale for secure
remote access, and the Docker Compose stack.

---

## Infrastructure Overview

| Layer | Technology |
|---|---|
| Hypervisor | Proxmox VE |
| Container | LXC — Ubuntu |
| Web server / proxy | nginx (inside Docker frontend image) |
| App runtime | Docker Compose |
| Database | MongoDB 7 (Docker volume) |
| SSL | Let's Encrypt (Certbot standalone) |
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

## 2. Domain DNS

Point both the apex and `www` to the LXC's public IP address:

| Type | Name | Value |
|---|---|---|
| A | `fire-hive.com` | `<server-ip>` |
| A | `www.fire-hive.com` | `<server-ip>` |

Ports **80** and **443** must be reachable from the internet (open in your
router/firewall if the server is behind NAT, or in your cloud provider's
security group).

---

## 3. SSL — Let's Encrypt (Certbot standalone)

Certbot's standalone mode spins up a temporary HTTP server on port 80 to
complete the ACME challenge. The Docker stack must be **stopped** first so port
80 is free.

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

# Certificate expiry
echo | openssl s_client -connect fire-hive.com:443 2>/dev/null \
  | openssl x509 -noout -dates
```
