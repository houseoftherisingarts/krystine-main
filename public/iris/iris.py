#!/usr/bin/env python3
"""Iris, le relais du terminal de Krystine (krystinestlaurent.ca/admin/infolettre).

L'onglet Terminal dépose chaque demande dans Firestore (`irisDemandes/{id}`,
statut `nouvelle`). Ce relais tourne sur l'ordinateur de Krystine (ou celui
d'Alex en secours), la fait répondre par `claude -p` (abonnement Claude Max,
aucune clé d'API) et écrit la réponse dans le même document (`repondue` ou
`echec`). Il bat le cœur dans `etat/iris` pour que l'onglet sache s'il est en
ligne. Une demande qui concerne le site plutôt que l'infolettre part vers
Vexel Webstudio (fonction recevoirDemande) et arrive dans l'onglet Demandes
d'Alex.

Bibliothèque standard seulement. Connexion Firestore : le compte
iris@krystinestlaurent.ca (iris_config.json à côté de ce fichier) ou, à défaut,
le jeton gcloud d'Alex. Les fichiers de ce dossier se mettent à jour tout
seuls depuis https://krystinestlaurent.ca/iris/ une fois l'heure.
"""

import datetime
import hashlib
import io
import zipfile
import json
import os
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    import certifi  # le python.org 3.13 n'a pas de chaîne de certificats
    _SSL = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL = ssl.create_default_context()

VERSION = "2.1.2"
PROJECT = "krystinestlaurent-87566"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(HERE, "iris_config.json")
LOG = os.path.join(HERE, "iris.log")
SOURCE = "https://krystinestlaurent.ca/iris/"
FICHIERS_DISTANTS = {"iris.py": os.path.abspath(__file__), "iris_system.md": None, "iris_site.md": None, "iris_terminal.md": None}
MODEL = os.environ.get("IRIS_MODEL", "opus")
POLL = 8            # secondes entre deux tours
HEARTBEAT = 30      # secondes entre deux battements
MISE_A_JOUR = 3600  # secondes entre deux vérifications des fichiers distants
CLAUDE_TIMEOUT = 300
VEXEL = "https://us-central1-vexel-integrations.cloudfunctions.net/recevoirDemande"
VEXEL_CLIENT = {"client": "krystine", "cle": "aT_yMR68NLyEW3weNDjwYdW_"}
BUCKET = f"{PROJECT}.firebasestorage.app"
VAULT_OBJET = "vault/krystine.zip"
VAULT_DOSSIER = "Krystine · Vexel"          # le dossier géré dans son Obsidian
VAULT_ETAT = os.path.join(HERE, "vault.json")
CONNEXION_TOUTES_LES = 300                   # secondes entre deux « claude auth status »


def premier(*noms):
    for n in noms:
        p = os.path.join(HERE, n)
        if os.path.exists(p):
            return p
    return os.path.join(HERE, noms[0])


SYSTEM_FILE = premier("iris_system.md", "krystine_iris_system.md")
SITE_FILE = premier("iris_site.md", "krystine_iris_site.md")

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["reply", "proposal", "demandeVexel"],
    "properties": {
        "reply": {"type": "string"},
        "demandeVexel": {"type": ["string", "null"]},
        "proposal": {
            "type": ["object", "null"],
            "required": ["title", "subject", "preheader", "blocks", "audience", "scheduledFor", "note"],
            "properties": {
                "title": {"type": "string"},
                "subject": {"type": "string"},
                "preheader": {"type": "string"},
                "blocks": {"type": "array", "items": {
                    "type": "object", "required": ["type", "content"],
                    "properties": {
                        "type": {"type": "string", "enum": ["heading", "paragraph", "image", "button", "quote", "cta", "divider", "spacer"]},
                        "content": {"type": "object"},
                    }}},
                "audience": {"type": "object", "required": ["mode"], "properties": {
                    "mode": {"type": "string", "enum": ["all", "tags", "emails"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "emails": {"type": "array", "items": {"type": "string"}},
                }},
                "scheduledFor": {"type": ["string", "null"]},
                "note": {"type": "string"},
            },
        },
    },
}


def log(msg):
    line = f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def config():
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


# ─── Jeton : compte Iris (Firebase) ou gcloud (secours, machine d'Alex) ─────
_tok = {"v": None, "t": 0}


def http_json(url, body=None, headers=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data else "GET"),
                                 headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, context=_SSL, timeout=60) as r:
        return r.status, json.loads(r.read() or b"{}")


def token(force=False):
    if not force and _tok["v"] and time.time() - _tok["t"] < 50 * 60:
        return _tok["v"]
    c = config()
    if c.get("motDePasse"):
        st, d = http_json(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + c["apiKey"],
            {"email": c["courriel"], "password": c["motDePasse"], "returnSecureToken": True})
        if not d.get("idToken"):
            raise RuntimeError("connexion du compte Iris refusée : " + json.dumps(d)[:200])
        _tok["v"], _tok["t"] = d["idToken"], time.time()
        return _tok["v"]
    gcloud = os.path.expanduser("~/google-cloud-sdk/bin/gcloud")
    if not os.path.exists(gcloud):
        gcloud = "gcloud"
    out = subprocess.run([gcloud, "auth", "print-access-token"], capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError("gcloud auth print-access-token : " + out.stderr.strip())
    _tok["v"], _tok["t"] = out.stdout.strip(), time.time()
    return _tok["v"]


def fs(method, path, body=None, params=None, retried=False):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, context=_SSL, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403) and not retried:
            token(force=True)
            return fs(method, path, body, params, retried=True)
        return e.code, json.loads(e.read() or b"{}")


def enc(v):
    if isinstance(v, dict) and v.get("__ts"):
        return {"timestampValue": now_iso()}
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    if isinstance(v, str):
        return {"stringValue": v}
    if isinstance(v, list):
        return {"arrayValue": {"values": [enc(x) for x in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {k: enc(x) for k, x in v.items()}}}
    return {"stringValue": str(v)}


def dec(f):
    if "stringValue" in f: return f["stringValue"]
    if "integerValue" in f: return int(f["integerValue"])
    if "doubleValue" in f: return f["doubleValue"]
    if "booleanValue" in f: return f["booleanValue"]
    if "timestampValue" in f: return f["timestampValue"]
    if "nullValue" in f: return None
    if "arrayValue" in f: return [dec(x) for x in f["arrayValue"].get("values", [])]
    if "mapValue" in f: return {k: dec(x) for k, x in f["mapValue"].get("fields", {}).items()}
    return None


def patch(path, d, update_time=None):
    params = [("updateMask.fieldPaths", k) for k in d]
    if update_time:
        params.append(("currentDocument.updateTime", update_time))
    return fs("PATCH", path, {"fields": {k: enc(v) for k, v in d.items()}}, params)


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def hote():
    return config().get("hote") or socket.gethostname().replace(".local", "")


_cx = {"v": "inconnue", "t": 0}


def connexion():
    """« connecte » quand Claude Code de cette machine est lié à un compte."""
    if time.time() - _cx["t"] < CONNEXION_TOUTES_LES:
        return _cx["v"]
    try:
        out = subprocess.run(["claude", "auth", "status"], capture_output=True, text=True, timeout=30)
        d = json.loads(out.stdout or "{}")
        _cx["v"] = "connecte" if d.get("loggedIn") else "non connecte"
    except FileNotFoundError:
        _cx["v"] = "claude absent"
    except Exception:  # noqa: BLE001
        _cx["v"] = "inconnue"
    _cx["t"] = time.time()
    return _cx["v"]


def heartbeat():
    st, d = patch("/etat/iris", {"battement": {"__ts": True}, "hote": hote(), "version": VERSION, "modele": MODEL,
                                 "connexion": connexion(), "vault": vault_etat().get("version") or ""})
    if st != 200:
        log(f"battement refusé {st} : {json.dumps(d)[:200]}")
    return st


def nouvelles():
    st, data = fs("POST", ":runQuery", {"structuredQuery": {
        "from": [{"collectionId": "irisDemandes"}],
        "where": {"fieldFilter": {"field": {"fieldPath": "statut"}, "op": "EQUAL", "value": {"stringValue": "nouvelle"}}},
        "limit": 5}})
    if st != 200:
        log(f"runQuery {st} : {json.dumps(data)[:200]}")
        return []
    out = []
    for row in data:
        d = row.get("document")
        if not d:
            continue
        out.append((d["name"].rsplit("/", 1)[1], {k: dec(v) for k, v in d.get("fields", {}).items()}, d.get("updateTime")))
    out.sort(key=lambda x: x[1].get("cree") or "")
    return out


# ─── Mise à jour depuis le site ─────────────────────────────────────────────
def mise_a_jour():
    """Rapatrie iris.py, iris_system.md et iris_site.md depuis le site. Si le
    relais lui-même a changé, il s'arrête : launchd le relance à neuf."""
    if not config().get("miseAJour", True):
        return
    redemarrer = False
    for nom, chemin in FICHIERS_DISTANTS.items():
        chemin = chemin or os.path.join(HERE, nom)
        try:
            with urllib.request.urlopen(SOURCE + nom, context=_SSL, timeout=30) as r:
                distant = r.read()
        except Exception as e:  # noqa: BLE001
            log(f"mise à jour {nom} impossible : {str(e)[:120]}")
            continue
        if len(distant) < 200:
            continue
        local = open(chemin, "rb").read() if os.path.exists(chemin) else b""
        if hashlib.sha256(local).digest() != hashlib.sha256(distant).digest():
            with open(chemin, "wb") as f:
                f.write(distant)
            log(f"mise à jour : {nom} ({len(distant)} octets)")
            if nom == "iris.py":
                redemarrer = True
    if redemarrer:
        log("nouveau relais : redémarrage")
        sys.exit(0)


# ─── Le paquet Obsidian de Krystine ─────────────────────────────────────────
def vault_etat():
    try:
        with open(VAULT_ETAT) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def obsidian_vault():
    """Le coffre Obsidian de cette machine (le premier ouvert), sinon un dossier
    dans Documents qu'Obsidian peut ouvrir tel quel."""
    c = config()
    if c.get("obsidian"):
        return os.path.expanduser(c["obsidian"])
    cand = os.path.expanduser("~/Library/Application Support/obsidian/obsidian.json")
    try:
        with open(cand) as f:
            vaults = json.load(f).get("vaults", {})
        ouverts = [v for v in vaults.values() if v.get("open")] or list(vaults.values())
        ouverts.sort(key=lambda v: -(v.get("ts") or 0))
        for v in ouverts:
            if v.get("path") and os.path.isdir(v["path"]):
                return v["path"]
    except (OSError, ValueError):
        pass
    return os.path.expanduser("~/Documents/Krystine (Obsidian)")


def vault_sync():
    """Rapatrie vault/krystine.zip (Storage, lecture réservée au compte Iris)
    quand son empreinte change, et remplace le dossier géré dans Obsidian.
    Les notes de Krystine hors de ce dossier ne sont jamais touchées."""
    if not config().get("motDePasse") or not config().get("vault", True):
        return
    url = f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/{urllib.parse.quote(VAULT_OBJET, safe='')}"
    req = urllib.request.Request(url, headers={"Authorization": "Firebase " + token()})
    try:
        with urllib.request.urlopen(req, context=_SSL, timeout=60) as r:
            meta = json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return
        log(f"paquet Obsidian : métadonnées {e.code}")
        return
    empreinte = meta.get("md5Hash") or meta.get("etag") or ""
    if not empreinte or empreinte == vault_etat().get("empreinte"):
        return
    req = urllib.request.Request(url + "?alt=media", headers={"Authorization": "Firebase " + token()})
    with urllib.request.urlopen(req, context=_SSL, timeout=300) as r:
        contenu = r.read()
    racine = obsidian_vault()
    cible = os.path.join(racine, VAULT_DOSSIER)
    os.makedirs(racine, exist_ok=True)
    tmp = cible + ".nouveau"
    if os.path.isdir(tmp):
        import shutil; shutil.rmtree(tmp)
    with zipfile.ZipFile(io.BytesIO(contenu)) as z:
        for m in z.infolist():
            if m.filename.startswith("/") or ".." in m.filename:
                continue
            z.extract(m, tmp)
    if os.path.isdir(cible):
        import shutil; shutil.rmtree(cible)
    os.rename(tmp, cible)
    version = (meta.get("metadata") or {}).get("version") or meta.get("updated", "")[:10]
    with open(VAULT_ETAT, "w") as f:
        json.dump({"empreinte": empreinte, "version": version, "dossier": cible, "quand": now_iso()}, f)
    log(f"paquet Obsidian {version} posé dans {cible}")
    installer_skills(cible)
    ecrire_regles(cible)


def installer_skills(cible):
    """Chaque dossier Skills/<nom> qui porte un SKILL.md va dans ~/.claude/skills,
    où Claude Code de cette machine l'active de lui-même."""
    if not config().get("skills", True):
        return
    import shutil
    src = os.path.join(cible, "Skills")
    dst = os.path.expanduser("~/.claude/skills")
    if not os.path.isdir(src):
        return
    os.makedirs(dst, exist_ok=True)
    n = 0
    for nom in sorted(os.listdir(src)):
        d = os.path.join(src, nom)
        if not os.path.exists(os.path.join(d, "SKILL.md")):
            continue
        cible_skill = os.path.join(dst, nom)
        if os.path.islink(cible_skill):
            os.unlink(cible_skill)
        elif os.path.isdir(cible_skill):
            shutil.rmtree(cible_skill)
        shutil.copytree(d, cible_skill)
        n += 1
    log(f"{n} skills installés dans {dst}")


def ecrire_regles(cible):
    """Concatène Règles/*.md et Règles/mémoires/*.md dans regles.md, que la
    commande « iris » ajoute à son prompt."""
    src = os.path.join(cible, "Règles")
    if not os.path.isdir(src):
        return
    morceaux = []
    for f in sorted(os.listdir(src)):  # les CLAUDE.md seulement : les mémoires se lisent à la demande
        if f.endswith(".md"):
            with open(os.path.join(src, f), encoding="utf-8", errors="replace") as fh:
                morceaux.append(f"\n\n===== {f} =====\n" + fh.read())
    mem = os.path.join(src, "mémoires")
    n_mem = len([f for f in os.listdir(mem) if f.endswith(".md")]) if os.path.isdir(mem) else 0
    tete = ("[LES RÈGLES D'ALEX ET DE VEXEL WEBSTUDIO, À RESPECTER DANS TOUT TRAVAIL]\n"
            f"Les {n_mem} mémoires de travail d'Alex (design, écriture, méthode) sont dans « {mem} » : "
            "lis celles qui touchent la tâche avant d'agir (ls puis cat). Le paquet complet (Site, Bibliothèque, Skills) est dans "
            f"« {cible} ».")
    with open(os.path.join(HERE, "regles.md"), "w", encoding="utf-8") as f:
        f.write(tete + "".join(morceaux))
    log(f"regles.md écrit ({len(morceaux)} fichiers)")


# ─── Claude ─────────────────────────────────────────────────────────────────
def build_prompt(d):
    tags = d.get("tags") or []
    draft = d.get("draft") or {}
    ctx = [
        f"Date et heure actuelles (America/Toronto) : {d.get('now') or now_iso()}.",
        "Listes (étiquettes) disponibles : " + (", ".join(f"{t.get('tag')} ({t.get('count')})" for t in tags) or "aucune") + ".",
        ("Brouillon actuel :\n" + json.dumps(draft, ensure_ascii=False)) if draft.get("blocks") else "Brouillon actuel : vide.",
    ]
    conv = []
    for m in (d.get("messages") or [])[-30:]:
        who = "Krystine" if m.get("role") == "user" else "Iris"
        conv.append(f"{who} : {str(m.get('content') or '')[:8000]}")
    return "[Contexte]\n" + "\n".join(ctx) + "\n\n[Conversation]\n" + "\n\n".join(conv) + "\n\nRéponds au dernier message de Krystine."


def system_prompt():
    s = open(SYSTEM_FILE, encoding="utf-8").read()
    if os.path.exists(SITE_FILE):
        s += "\n\n[LE SITE DE KRYSTINE, EN DÉTAIL]\n" + open(SITE_FILE, encoding="utf-8").read()
    return s


def run_claude(prompt):
    cmd = ["claude", "-p", "--output-format", "json", "--json-schema", json.dumps(SCHEMA),
           "--system-prompt", system_prompt(), "--model", MODEL, "--no-session-persistence", "--tools", "",
           "--strict-mcp-config"]  # aucun serveur MCP de la machine (Serena et compagnie restent fermés)
    out = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=CLAUDE_TIMEOUT, cwd=HERE)
    try:
        data = json.loads(out.stdout)
    except ValueError:
        data = {}
    if out.returncode != 0 or data.get("is_error") or data.get("subtype", "").startswith("error"):
        r = str(data.get("result") or "").strip() or out.stderr.strip() or out.stdout.strip()[:300] or f"claude a rendu {out.returncode}"
        if not data.get("result") or any(m in r.lower() for m in ("login", "logged", "auth", "api key", "billing", "plan")):
            r = "Claude Code de cet ordinateur n'a pas répondu (compte non relié, ou forfait sans accès à Claude Code). Ouvrez le Terminal, tapez « claude », puis « /login ». Détail : " + r
        raise RuntimeError(r[:500])
    so = data.get("structured_output")
    if not so:
        so = json.loads(data.get("result") or "{}")
    return so, data.get("duration_ms")


def clean_blocks(blocks):
    out = []
    for b in blocks or []:
        c = {k: v for k, v in (b.get("content") or {}).items() if v not in (None, "")}
        out.append({"type": b.get("type"), "content": c})
    return out


def vers_vexel(texte, d):
    """Dépose la demande de changement dans la boîte Demandes de Vexel."""
    corps = {**VEXEL_CLIENT, "texte": texte, "auteurNom": "Iris, pour Krystine", "auteurCourriel": "krystine@inspiratanature.com",
             "agent": f"iris {VERSION} sur {hote()}"}
    st, rep = http_json(VEXEL, corps)
    if st >= 300:
        raise RuntimeError(f"Vexel a répondu {st}")
    return rep.get("id") or rep.get("demande") or ""


def handle(doc_id, d, update_time):
    st, _ = patch(f"/irisDemandes/{doc_id}", {"statut": "en_cours", "prise": {"__ts": True}, "hote": hote()}, update_time)
    if st != 200:
        return  # une autre instance l'a prise
    log(f"→ {doc_id} : {str((d.get('messages') or [{}])[-1].get('content'))[:80]}")
    t0 = time.time()
    try:
        so, ms = run_claude(build_prompt(d))
        prop = so.get("proposal")
        if prop:
            prop["blocks"] = clean_blocks(prop.get("blocks"))
            a = prop.get("audience") or {}
            prop["audience"] = {"mode": a.get("mode", "all"), "tags": a.get("tags") or [], "emails": a.get("emails") or []}
            prop["scheduledFor"] = prop.get("scheduledFor") or None
        reply = so.get("reply") or (prop or {}).get("note") or ""
        demande = (so.get("demandeVexel") or "").strip()
        champs = {"statut": "repondue", "reply": reply,
                  "proposalJson": json.dumps(prop, ensure_ascii=False) if prop else None,
                  "repondue": {"__ts": True}, "dureeMs": int(ms or (time.time() - t0) * 1000)}
        if demande:
            try:
                vers_vexel(demande, d)
                champs["demandeVexel"] = demande
            except Exception as e:  # noqa: BLE001
                champs["reply"] = reply + f"\n\n(La demande n'a pas pu partir vers Vexel : {str(e)[:120]}. Vous pourrez la redire dans l'onglet Demande de changement.)"
        patch(f"/irisDemandes/{doc_id}", champs)
        log(f"✓ {doc_id} en {round(time.time() - t0)} s{' · infolettre proposée' if prop else ''}{' · demande vers Vexel' if demande else ''}")
    except Exception as e:  # noqa: BLE001
        msg = str(e)[:600]
        patch(f"/irisDemandes/{doc_id}", {"statut": "echec", "erreur": msg, "repondue": {"__ts": True}})
        log(f"✗ {doc_id} : {msg}")


def main():
    once = "--once" in sys.argv
    log(f"Iris {VERSION} démarre sur {hote()} (modèle {MODEL}, compte {'Iris' if config().get('motDePasse') else 'gcloud'})")
    last_beat = 0
    last_maj = time.time()
    if not once:
        mise_a_jour()
    try:
        vault_sync()
    except Exception as e:  # noqa: BLE001
        log(f"paquet Obsidian : {str(e)[:200]}")
    while True:
        try:
            if time.time() - last_beat > HEARTBEAT:
                heartbeat(); last_beat = time.time()
            for doc_id, d, ut in nouvelles():
                handle(doc_id, d, ut)
                heartbeat(); last_beat = time.time()
            if time.time() - last_maj > MISE_A_JOUR:
                last_maj = time.time(); mise_a_jour(); vault_sync()
        except Exception as e:  # noqa: BLE001
            log(f"tour en erreur : {str(e)[:300]}")
        if once:
            break
        time.sleep(POLL)


if __name__ == "__main__":
    main()
