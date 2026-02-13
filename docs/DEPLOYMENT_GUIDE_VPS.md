# Enterprise VPS Deployment Guide

This guide details the step-by-step process for deploying the CMS to a production Ubuntu VPS.

---

## **1. Initial Server Setup**

Connect to your VPS:
```bash
ssh root@your_server_ip
```

### **Update & Upgrade**
```bash
sudo apt update && sudo apt upgrade -y
```

### **Create a Deployment User**
Do NOT run your application as root.
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### **Install Docker & Docker Compose**
```bash
# Install Docker Repository
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Repo
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Allow deploy user to execute docker commands
sudo usermod -aG docker clean
newgrp docker
```

---

## **2. Application Deployment**

### **Clone Repository**
```bash
git clone https://github.com/yourusername/cms-project.git
cd cms-project
```

### **Environment Configuration**
Create the production environment file:
```bash
cp .env.example .env.production
nano .env.production
```
**Required Variables:**
```ini
NODE_ENV=production
# Update with strong passwords
DB_ROOT_PASSWORD=Str0ngP@ssw0rd!
DB_USER=cms_user
DB_PASSWORD=AnotherStr0ngP@ssw0rd
DB_NAME=cms_prod
JWT_SECRET=Sup3rSecr3tK3yF0rJWT
# Host Setup
DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

### **Start Production Services**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
> **Note:** The `-f docker-compose.prod.yml` flag ensures you use the production configuration.

---

## **3. SSL & Nginx Configuration**

We recommend using Nginx as a reverse proxy with Let's Encrypt for SSL.

### **Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### **Obtain SSL Certificate**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **Configure Nginx Proxy**
Edit your Nginx config:
```bash
sudo nano /etc/nginx/sites-available/default
```
Add the following proxy pass to your server block:

```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:80; # Frontend container port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000; # Backend container port if exposed or routed via internal docker network
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
**Verify & Reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## **4. Security Hardening**

### **Configure Firewall (UFW)**
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### **Fail2Ban Implementation**
Prevent brute-force attacks:
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## **5. Maintenance & Updates**

### **Updating Application**
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker system prune -f # Cleanup unused images
```

### **Checking Logs**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100
```
