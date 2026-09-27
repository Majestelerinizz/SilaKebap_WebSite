from pathlib import Path

path = Path("/opt/silakebap/.env")
keys = {
    "API_PUBLIC_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_SITE_URL",
    "WEB_ORIGIN",
    "ADMIN_ORIGIN",
}
lines = []
for line in path.read_text().splitlines():
    key, sep, value = line.partition("=")
    if sep and key in keys and value.startswith("http://"):
        line = f"{key}=https://{value[len('http://'):]}"
    lines.append(line)
path.write_text("\n".join(lines) + "\n")
print("ORIGINS_HTTPS")
