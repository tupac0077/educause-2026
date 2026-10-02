try:
    from ._version import version
except ModuleNotFoundError:
    # Fallback for environments where version file is not generated in build artifacts.
    version = "0.0.0"

__version__ = version
