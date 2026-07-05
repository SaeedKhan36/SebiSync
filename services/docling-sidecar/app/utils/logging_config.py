"""Structured logging configuration for the sidecar service."""

import logging
import sys


def configure_logging(level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger("docling_sidecar")
    if logger.handlers:
        return logger

    logger.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s :: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


logger = configure_logging()
