"""Phone helpers: canonical storage is exactly 10 digits (no country-code rules)."""

# Business rule: local numbers are stored as digit strings of this length only.
PHONE_DIGIT_COUNT = 10


def digits_only(value: str) -> str:
    return "".join(c for c in (value or "") if c.isdigit())


def normalize_phone_number(value: str | None) -> str | None:
    """Return exactly ``PHONE_DIGIT_COUNT`` digits, or ``None`` if input is invalid."""
    d = digits_only(value or "")
    if len(d) != PHONE_DIGIT_COUNT:
        return None
    return d


def describe_phone_rule() -> str:
    return f"Phone number must be exactly {PHONE_DIGIT_COUNT} digits (you may use spaces or dashes)."
