# Déploiement derrière Traefik : dev, recette, production

Traefik reçoit tout le trafic web et l'envoie au bon environnement selon le nom de domaine.

```
Internet ──► Cloudflare ──► (tunnel ou ports 80/443) ──► Traefik (172.30.0.2)
                                                            │  réseau Docker « proxy » 172.30.0.0/24
                    ┌───────────────────────────────────────┼──────────────────────────────┐
     dev-gridbook.visioninfo.fr               rec-gridbook.visioninfo.fr          gridbook.visioninfo.fr
     stack gridbook_new (nginx :8080)         stack gridbook_rec                  stack gridbook_prod
       └─ backend ─ db                          └─ backend ─ db                     └─ backend ─ db
```

- Chaque environnement est une stack Docker Compose indépendante (sa base, ses images, son `.env`).
- Le frontend (nginx) de chaque stack rejoint le réseau `proxy` et se déclare à Traefik par des
  labels (`docker-compose.yml` à la racine) : nom de domaine `APP_HOST`, routeur `TRAEFIK_ROUTER`.
- Les backends et les bases ne sont **jamais** sur le réseau `proxy` : seul nginx est exposé.

## État actuel (27 octobre 2026)

| Environnement | Nom de domaine | État |
|---|---|---|
| Développement | `dev-gridbook.visioninfo.fr` | stack en ligne derrière Traefik **sur cette machine**, testée en local ; pas encore joignable depuis Internet ; **pas d'enregistrement DNS** |
| Recette | `rec-gridbook.visioninfo.fr` | à lancer (procédure ci-dessous) ; **pas d'enregistrement DNS** |
| Production | `gridbook.visioninfo.fr` | le domaine sert **l'ancien GridBook**, hébergé sur un autre serveur derrière Cloudflare ; à migrer (procédure ci-dessous) |

Cette machine (`192.168.80.130`) est derrière un routeur : Internet ne la joint pas directement.

## 1. Traefik (une fois par machine)

```bash
docker network create --subnet 172.30.0.0/24 proxy
cd deploy/traefik
cp .env.example .env && chmod 600 .env
docker compose --env-file .env up -d
```

- Version figée : `traefik:v3.7.14`. Les versions 3.1 et antérieures ne fonctionnent pas avec
  Docker 29 (API trop ancienne).
- Tableau de bord : http://127.0.0.1:8088/dashboard/ sur la machine, ou depuis un autre poste par
  tunnel SSH : `ssh -L 8088:127.0.0.1:8088 utilisateur@machine`.
- Les routeurs actifs : `curl -s http://127.0.0.1:8088/api/http/routers`.

## 2. Réglages par environnement

Dans le `.env` de chaque stack (copié depuis `.env.example`) :

| Variable | Dev | Recette | Production |
|---|---|---|---|
| `APP_HOST` | `dev-gridbook.visioninfo.fr` | `rec-gridbook.visioninfo.fr` | `gridbook.visioninfo.fr` |
| `TRAEFIK_ROUTER` | `gridbook-dev` | `gridbook-rec` | `gridbook-prod` |
| `FRONTEND_BIND` | `0.0.0.0` | `127.0.0.1` | `127.0.0.1` |
| `FRONTEND_PORT` | `5174` | `5175` | `5176` |
| `BACKEND_PORT` | `8001` | `8002` | `8003` |
| `DB_EXPOSED_PORT` | `3308` | `3309` | `3310` |
| `COOKIE_NAME` | `gridbook_dev_session` | `gridbook_rec_session` | `gridbook_session` |
| `COOKIE_SECURE` | `false` (puis `true` en HTTPS) | `true` | `true` |
| `CORS_ORIGINS`, `FRONTEND_URL` | `https://dev-gridbook.visioninfo.fr` (+ `http://localhost:5174`) | `https://rec-gridbook.visioninfo.fr` | `https://gridbook.visioninfo.fr` |
| `TEST_USER_*` | renseigné | renseigné | **vide** (pas de compte de test en production) |
| `ENABLE_API_DOCS` | `false` | `false` | `false` |
| Mots de passe, `JWT_SECRET_KEY` | propres à l'environnement | propres à l'environnement | propres à l'environnement, jamais réutilisés |

Le nom de la stack (`-p`) doit être différent pour chaque environnement : les bases restent séparées.

## 3. Lancer la recette (depuis la branche `staging`)

```bash
git clone --branch staging https://github.com/Pro-Nolan/GridBook.git ~/gridbook-rec
cd ~/gridbook-rec
cp .env.example .env && chmod 600 .env     # valeurs de la colonne « Recette »
docker compose -p gridbook_rec up -d --build
```

Vérifier avant toute publication :

```bash
curl -s --resolve rec-gridbook.visioninfo.fr:80:127.0.0.1 http://rec-gridbook.visioninfo.fr/ | grep -o "<title>[^<]*"
```

Mise à jour de la recette : `git pull` puis `docker compose -p gridbook_rec up -d --build`
(à automatiser par la CI, mission du M2 Cloud).

## 4. Production

`gridbook.visioninfo.fr` sert aujourd'hui l'ancien site, depuis un autre serveur. La bascule est
une **migration de production** :

1. Déployer la stack `gridbook_prod` (branche `main`, colonne « Production ») sur le serveur de
   production, derrière son Traefik.
2. Tester par le nom de domaine sans toucher au DNS (`curl --resolve gridbook.visioninfo.fr:443:<ip>`).
3. Décider du sort des données de l'ancien site : la nouvelle version démarre avec une base neuve.
4. Basculer le DNS (ou la route du tunnel) vers le nouveau serveur, à un moment calme.
5. Garder l'ancien serveur intact quelques jours : revenir en arrière = repointer le DNS.

## 5. Publier sur Internet

### Option A : tunnel Cloudflare (recommandée pour cette machine)

Aucun port à ouvrir sur le routeur ; le domaine est déjà chez Cloudflare.

1. Cloudflare → Zero Trust → Réseaux → Tunnels → créer un tunnel « gridbook ».
2. Ajouter les noms publics `dev-gridbook.visioninfo.fr` et `rec-gridbook.visioninfo.fr`,
   service **`http://traefik:80`** (Cloudflare crée lui-même les enregistrements DNS).
3. Copier le jeton du tunnel dans `deploy/traefik/.env` (`TUNNEL_TOKEN=`), puis :
   ```bash
   cd deploy/traefik && docker compose --env-file .env --profile tunnel up -d
   ```
4. Le HTTPS est assuré par Cloudflare ; le tunnel est chiffré jusqu'à la machine.

### Option B : redirection des ports 80 et 443

1. Sur le routeur / OPNsense : rediriger 80 et 443 vers `192.168.80.130`.
2. Cloudflare : enregistrements `A` `dev-gridbook` et `rec-gridbook` vers l'adresse publique,
   proxy activé, mode SSL **Full (strict)**.
3. Certificats Let's Encrypt par défi DNS : jeton d'API Cloudflare (droit « Zone DNS :
   modification » sur `visioninfo.fr`) dans `deploy/traefik/.env` (`CF_DNS_API_TOKEN=`), puis
   redémarrer Traefik. Sans jeton, Traefik journalise une erreur de certificat : c'est attendu.

### Une fois le HTTPS en place

- `COOKIE_SECURE=true` et `FRONTEND_URL=https://…` dans le `.env` de la stack.
- Décommenter l'en-tête HSTS dans `docker/frontend/nginx.conf`.
- `FRONTEND_BIND=127.0.0.1` en recette et en production : le site ne passe plus que par Traefik.

## Sécurité : adresse réelle des visiteurs

La limite de débit de nginx et du backend compte les requêtes **par visiteur**. Derrière plusieurs
intermédiaires, l'adresse du visiteur arrive dans l'en-tête `X-Forwarded-For`, qu'un client peut
aussi inventer. Règles appliquées :

- Traefik n'accepte un `X-Forwarded-For` existant que s'il vient de Cloudflare ou du tunnel
  (`172.30.0.3`) ; sinon il le remplace par l'adresse qu'il voit.
- nginx ne lit `X-Forwarded-For` que s'il vient de Traefik (`172.30.0.2`) ou du tunnel.
- **Ne jamais déclarer toute la plage `172.30.0.0/24` comme fiable** : sa passerelle (`.1`) fait
  entrer le trafic des ports publiés, et n'importe qui pourrait annoncer une fausse adresse
  (testé : une fausse adresse est ignorée avec les réglages actuels).
- La liste des adresses Cloudflare (dans `traefik.yml` et `nginx.conf`) est à mettre à jour si
  Cloudflare la change : https://www.cloudflare.com/ips/

Autre point à traiter par le M2 Cloud : Traefik lit le socket Docker (en lecture seule). Un accès
au socket équivaut à un accès administrateur à la machine ; un proxy de socket limité aux lectures
(par exemple `tecnativa/docker-socket-proxy`) réduirait ce risque.
