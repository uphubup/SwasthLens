import re
from pathlib import Path

def clean_star_styles(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    original = text
    text = re.sub(r';\s*--twinkle-duration:[^;"\']*', '', text)
    text = re.sub(r';\s*animation-delay:[^;"\']*', '', text)
    if text != original:
        path.write_text(text, encoding='utf-8')

if __name__ == '__main__':
    base = Path(r'c:/Users/Abcom/Desktop/SwasthSetu')
    clean_star_styles(base / 'index.html')
