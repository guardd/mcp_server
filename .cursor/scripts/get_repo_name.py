import subprocess
import urllib.parse as up

def _origin_url() -> str:
    # Prefer `git remote get-url origin`, fall back to config if needed
    for cmd in (["git", "remote", "get-url", "origin"],
                ["git", "config", "--get", "remote.origin.url"]):
        try:
            out = subprocess.check_output(cmd, text=True).strip()
            if out:
                return out
        except Exception:
            pass
    return ""

def _owner_repo_from_url(u: str) -> str:
    if not u:
        return ""

    # HTTPS/SSH URL
    if "://" in u:
        path = up.urlparse(u).path
    else:
        # SCP-like: git@github.com:OWNER/REPO.git
        if ":" in u and "@" in u.split(":", 1)[0]:
            path = u.split(":", 1)[1]
        else:
            path = u

    path = path.strip("/")
    if path.endswith(".git"):
        path = path[:-4]

    parts = [p for p in path.split("/") if p]
    return "/".join(parts[-2:]) if len(parts) >= 2 else path

if __name__ == "__main__":
    print(_owner_repo_from_url(_origin_url()))