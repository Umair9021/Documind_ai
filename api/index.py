import sys
from pathlib import Path

# Add backend directory to Python sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
backend_path = BASE_DIR / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from main import app
