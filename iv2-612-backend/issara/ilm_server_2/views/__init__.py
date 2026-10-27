import importlib.util
import os

# Load the original views.py module from the package directory so existing
# code can continue to live in `views.py` while we expose a `views` package.
_here = os.path.dirname(__file__)
_orig_views_path = os.path.abspath(os.path.join(_here, "..", "views.py"))

if os.path.exists(_orig_views_path):
    spec = importlib.util.spec_from_file_location(
        "issara.ilm_server_2._legacy_views_module", _orig_views_path
    )
    _legacy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(_legacy)

    # Re-export public symbols from the legacy module
    for _name in dir(_legacy):
        if not _name.startswith("_"):
            globals()[_name] = getattr(_legacy, _name)

    __all__ = [n for n in dir(_legacy) if not n.startswith("_")]
else:
    # If there's no legacy views.py (e.g., after a migration), expose an empty package
    __all__ = []
