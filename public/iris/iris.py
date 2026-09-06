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

VERSION = "2.0.0"
PROJECT = "krystinestlaurent-87566"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(HERE, "iris_config.json")
LOG = os.path.join(HERE, "iris.log")
SOURCE = "https://krystinestlaurent.ca/iris/"
FICHIERS_DISTANTS = {"iris.py": os.path.abspath(__file__), "iris_system.md": None, "iris_site.md": None}
MODEL = os.environ.get("IRIS_MODEL", "opus")
POLL = 8            # secondes entre deux tours
HEARTBEAT = 30      # secondes entre deux battements
MISE_A_JOUR = 3600  # secondes entre deux vérifications des fichiers distants
CLAUDE_TIMEOUT = 300
VEXEL = "https://us-central1-vexel-integrations.cloudfunctions.net/recevoirDemande"
VEXEL_CLIENT = {"client": "krystine", "cle": "aT_yMR68NLyEW3weNDjwYdW_"}


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


def heartbeat():
    st, d = patch("/etat/iris", {"battement": {"__ts": True}, "hote": hote(), "version": VERSION, "modele": MODEL})
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
           "--system-prompt", system_prompt(), "--model", MODEL, "--no-session-persistence", "--tools", ""]
    out = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=CLAUDE_TIMEOUT, cwd=HERE)
    if out.returncode != 0:
        raise RuntimeError((out.stderr or out.stdout).strip()[:400] or f"claude a rendu {out.returncode}")
    data = json.loads(out.stdout)
    if data.get("is_error"):
        raise RuntimeError(str(data.get("result"))[:400])
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
        msg = str(e)[:400]
        patch(f"/irisDemandes/{doc_id}", {"statut": "echec", "erreur": msg, "repondue": {"__ts": True}})
        log(f"✗ {doc_id} : {msg}")


def main():
    once = "--once" in sys.argv
    log(f"Iris {VERSION} démarre sur {hote()} (modèle {MODEL}, compte {'Iris' if config().get('motDePasse') else 'gcloud'})")
    last_beat = 0
    last_maj = time.time()
    if not once:
        mise_a_jour()
    while True:
        try:
            if time.time() - last_beat > HEARTBEAT:
                heartbeat(); last_beat = time.time()
            for doc_id, d, ut in nouvelles():
                handle(doc_id, d, ut)
                heartbeat(); last_beat = time.time()
            if time.time() - last_maj > MISE_A_JOUR:
                last_maj = time.time(); mise_a_jour()
        except Exception as e:  # noqa: BLE001
            log(f"tour en erreur : {str(e)[:300]}")
        if once:
            break
        time.sleep(POLL)


if __name__ == "__main__":
    main()
