import requests
from bs4 import BeautifulSoup
import os
import sys
from datetime import datetime, timezone

# --- CONFIG ---
URLS = [
    "https://guineematin.com",
    "https://guineematin.com/category/education/",
]
# Mots-clés de PREMIERE PASSE : plus larges, juste pour savoir ou chercher.
# Ils ne suffisent plus a declencher une alerte tout seuls (trop de faux positifs).
MOTS_CLES_DETECTION = ["résultats bac", "baccalauréat 2026", "resultats bac"]

# Mots qui doivent apparaitre PRES du mot-cle pour que ca vaille la peine
# d'interroger le LLM (evite d'appeler l'API pour rien).
MOTS_CONFIRMATION = ["disponible", "publié", "publie", "sorti", "proclamé", "proclame", "en ligne", "consulter"]

GITHUB_TOKEN = os.environ.get("GH_TOKEN")
REPO = os.environ.get("GITHUB_REPOSITORY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
HEADERS_API = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
}
FICHIER_HISTORIQUE = "historique.log"
# Chemin fourni automatiquement par GitHub Actions pour écrire le résumé visible
# directement dans l'onglet Actions (sans avoir à ouvrir les logs).
FICHIER_RESUME = os.environ.get("GITHUB_STEP_SUMMARY")


def log_historique(ligne: str):
    with open(FICHIER_HISTORIQUE, "a", encoding="utf-8") as f:
        f.write(ligne + "\n")


def ecrire_resume(texte_markdown: str):
    """Écrit dans le résumé du run GitHub Actions : visible directement
    dans l'onglet Actions, sans avoir à déplier les logs."""
    if FICHIER_RESUME:
        with open(FICHIER_RESUME, "a", encoding="utf-8") as f:
            f.write(texte_markdown + "\n")
    # On l'affiche aussi dans les logs bruts par sécurité
    print(texte_markdown)


def issue_similaire_existe(titre_recherche: str) -> bool:
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = {"state": "open", "per_page": 50}
    reponse = requests.get(url, headers=HEADERS_API, params=params, timeout=15)
    if reponse.status_code != 200:
        print(f"Attention : impossible de verifier les issues existantes ({reponse.status_code}).")
        return False
    for issue in reponse.json():
        if titre_recherche in issue.get("title", ""):
            return True
    return False


def creer_issue_github(titre: str, corps: str):
    url = f"https://api.github.com/repos/{REPO}/issues"
    payload = {"title": titre, "body": corps}
    reponse = requests.post(url, headers=HEADERS_API, json=payload, timeout=15)
    if reponse.status_code == 201:
        print("Issue creee avec succes (notification envoyee).")
        return True
    else:
        print(f"Erreur creation issue : {reponse.status_code} - {reponse.text}")
        return False


def trouver_ou_creer_issue_statut() -> int:
    """Retourne le numero de l'issue de statut, la cree si elle n'existe pas encore."""
    titre_statut = "Statut surveillance Bac 2026 (mise a jour automatique)"
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = {"state": "open", "per_page": 50}
    reponse = requests.get(url, headers=HEADERS_API, params=params, timeout=15)

    if reponse.status_code == 200:
        for issue in reponse.json():
            if issue.get("title") == titre_statut:
                return issue["number"]

    # Pas trouvee : on la cree
    creation = requests.post(url, headers=HEADERS_API, json={"title": titre_statut, "body": "Suivi automatique des verifications."}, timeout=15)
    if creation.status_code == 201:
        return creation.json()["number"]
    return None


def poster_commentaire_statut(numero_issue: int, texte: str):
    """Poste un COMMENTAIRE (pas une simple edition) sur l'issue de statut.
    Un commentaire declenche une vraie notification push, contrairement
    a une edition silencieuse du corps de l'issue."""
    if numero_issue is None:
        print("Impossible de poster le commentaire : issue de statut introuvable.")
        return
    url = f"https://api.github.com/repos/{REPO}/issues/{numero_issue}/comments"
    requests.post(url, headers=HEADERS_API, json={"body": texte}, timeout=15)


def extraire_contexte(texte: str, mot: str, marge: int = 300) -> str:
    idx = texte.find(mot)
    if idx == -1:
        return ""
    debut = max(0, idx - marge)
    fin = min(len(texte), idx + len(mot) + marge)
    return texte[debut:fin]


def confirmer_avec_llm(extrait: str) -> bool:
    """Envoie l'extrait a un LLM via OpenRouter pour confirmer si ca annonce
    reellement la sortie des resultats (evite les faux positifs)."""
    if not OPENROUTER_API_KEY:
        print("Pas de cle OpenRouter configuree, confirmation LLM sautee (on alerte par prudence).")
        return True

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    prompt = (
        "Voici un extrait d'une page web guineenne. Reponds UNIQUEMENT par OUI ou NON.\n\n"
        "Question : Est-ce que cet extrait annonce que les resultats officiels du "
        "baccalaureat 2026 en Guinee sont deja publies/disponibles/proclames "
        "(et pas juste une mention du calendrier, des inscriptions, ou d'une date future) ?\n\n"
        f"Extrait :\n{extrait}"
    )
    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 5,
        "temperature": 0,
    }
    try:
        reponse = requests.post(url, headers=headers, json=payload, timeout=30)
        reponse.raise_for_status()
        texte_reponse = reponse.json()["choices"][0]["message"]["content"].strip().upper()
        print(f"Reponse LLM : {texte_reponse}")
        return texte_reponse.startswith("OUI")
    except Exception as e:
        print(f"Erreur appel LLM : {e} — par prudence, NON confirme.")
        return False


def scanner_page(url: str) -> list:
    """Retourne les mots-cles CONFIRMES par le LLM. Liste vide = rien de confirme.
    None = erreur de connexion."""
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        reponse = requests.get(url, headers=headers, timeout=20)
        reponse.raise_for_status()
    except requests.RequestException as e:
        print(f"Erreur de connexion a {url} : {e}")
        return None

    soup = BeautifulSoup(reponse.text, "html.parser")
    texte_page = soup.get_text().lower()

    confirmes = []
    for mot in MOTS_CLES_DETECTION:
        if mot not in texte_page:
            continue
        extrait = extraire_contexte(texte_page, mot)
        a_proximite = any(conf in extrait for conf in MOTS_CONFIRMATION)
        if not a_proximite:
            print(f"'{mot}' trouve sur {url} mais sans mot de confirmation a proximite — ignore.")
            continue
        if confirmer_avec_llm(extrait):
            confirmes.append(mot)
        else:
            print(f"'{mot}' trouve sur {url} mais NON confirme par le LLM — probable faux positif.")

    return confirmes


def scanner_site():
    maintenant = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    trouvailles_globales = {}
    erreurs = []

    for url in URLS:
        resultat = scanner_page(url)
        if resultat is None:
            erreurs.append(url)
        elif resultat:
            trouvailles_globales[url] = resultat

    # --- CAS 1 : le bac est sorti (mot-cle trouve) ---
    if trouvailles_globales:
        titre_alerte = "ALERTE : Resultats Bac 2026 detectes !"
        details = "\n".join(
            f"- {url} -> mots trouves : {', '.join(mots)}"
            for url, mots in trouvailles_globales.items()
        )

        if issue_similaire_existe(titre_alerte):
            ecrire_resume(f"## 🚨 BAC SORTI (deja signale)\nVerification : {maintenant}\n\n{details}\n\nUne issue existe deja, pas de doublon cree.")
        else:
            corps = f"Detecte le {maintenant} :\n\n{details}"
            creer_issue_github(titre_alerte, corps)
            ecrire_resume(f"## 🚨 BAC SORTI - NOUVELLE ALERTE CREEE\nVerification : {maintenant}\n\n{details}")

        log_historique(f"{maintenant} - TROUVE - {trouvailles_globales}")
        return

    # --- CAS 2 : erreur de connexion sur au moins une page ---
    if erreurs:
        ecrire_resume(
            f"## ⚠️ ERREUR DE CONNEXION\nVerification : {maintenant}\n"
            f"Impossible de joindre : {', '.join(erreurs)}\n"
            f"Le bac n'a PAS ete confirme absent — la verification a echoue, pas de conclusion fiable."
        )
        log_historique(f"{maintenant} - ERREUR - {erreurs}")
        return

    # --- CAS 3 : tout a bien tourne, rien trouve ---
    ecrire_resume(f"## ✅ Bac pas encore sorti\nDerniere verification reussie : {maintenant}\nAucun mot-cle detecte sur : {', '.join(URLS)}")
    log_historique(f"{maintenant} - rien trouve")

    numero_statut = trouver_ou_creer_issue_statut()
    poster_commentaire_statut(numero_statut, f"Verification du {maintenant} : rien trouve, tout fonctionne normalement.")


if __name__ == "__main__":
    if not GITHUB_TOKEN or not REPO:
        print("Erreur : variables GH_TOKEN ou GITHUB_REPOSITORY manquantes.")
        sys.exit(1)
    scanner_site()
