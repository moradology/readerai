"""
Base configuration types and enums
"""

from enum import StrEnum


class Environment(StrEnum):
    """Application environments"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
