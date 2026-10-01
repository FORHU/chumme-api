# HTTPS for chumme-api

Today the app calls `http://ec2-56-10-7-132.ap-southeast-1.compute.amazonaws.com:3002`, so logins and tokens cross the network unencrypted. This sets up `https://<domain>` using Caddy on the same EC2 instance. Caddy gets and renews a free Let's Encrypt certificate on its own.

Everything is already in the repo (`caddy` service in `deploy/docker-compose.prod.yaml`, `API_DOMAIN` in `deploy.yml`). Caddy stays off until step 5.

## 1. Check that ports 80 and 443 are free on the instance

The instance is shared with BOOSTK, whose nginx has held port 80 on this kind of setup before. Over SSH:

```sh
sudo ss -ltnp | grep -E ':(80|443) '
```

- **No output:** go on to step 2.
- **nginx is listed:** Caddy can't bind those ports. Stop here and use [the nginx route](#if-nginx-holds-80443) instead.

## 2. Confirm the IP is an Elastic IP

A plain public IP changes when the instance stops and starts, and the DNS record would then point at someone else's machine. In the EC2 console, open **Elastic IPs** and check that `56.10.7.132` is listed and associated with instance `i-0cffa7ce62849f1dd`. If it isn't, allocate one and associate it before going further.

## 3. Point the domain at it

At the DNS provider, create an `A` record such as `api.<your-domain>` → `56.10.7.132`. Check it:

```sh
nslookup api.<your-domain>   # must return 56.10.7.132
```

## 4. Open the ports

Add inbound rules on the instance's security group: TCP 80 and TCP 443 from `0.0.0.0/0`. Port 80 is needed: Let's Encrypt validates through it, and Caddy redirects it to HTTPS.

Keep port 3002 open. Installed APKs still call it until users update.

## 5. Turn it on

GitHub → Settings → Environments → `dev` → Variables: set `API_DOMAIN` = `api.<your-domain>`, then run **Deploy to EC2**.

The final step, **Verify public HTTPS endpoint**, checks `https://<domain>/api/v1/health` from outside. If it's green, HTTPS works for real users, not just on the box.

## 6. Switch the app

In `chumme-app-v3/eas.json`, set `EXPO_PUBLIC_API_BASE_URL` to `https://api.<your-domain>` in all three profiles and build new APKs. Once those are out and old installs have updated, close port 3002 in the security group.

## If nginx holds 80/443

Leave `API_DOMAIN` empty. Add a separate server block to the existing nginx, in its own file so BOOSTK's config isn't edited:

```nginx
# /etc/nginx/conf.d/chumme-api.conf
server {
    server_name api.<your-domain>;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;     # Socket.IO websockets
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 200m;                  # matches multer fileSize in upload.middleware.ts
    }
}
```

Then run `sudo nginx -t && sudo systemctl reload nginx && sudo certbot --nginx -d api.<your-domain>`. Steps 2, 3, 4 and 6 still apply.
