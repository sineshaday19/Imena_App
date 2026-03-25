from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Q

User = get_user_model()


def _lookup_variants(raw: str) -> list[str]:
    out: list[str] = [raw]
    if raw.startswith("+") and len(raw) > 1 and raw[1:].isdigit():
        alt = raw[1:]
        if alt not in out:
            out.append(alt)
    elif raw.isdigit():
        alt = f"+{raw}"
        if alt not in out:
            out.append(alt)
    return out


class Command(BaseCommand):
    help = "List users whose username or phone_number matches the value (also tries with/without a leading +)."

    def add_arguments(self, parser):
        parser.add_argument("value", type=str)

    def handle(self, *args, **options):
        raw = (options["value"] or "").strip()
        if not raw:
            self.stderr.write("Empty value.")
            return
        q = Q()
        for v in _lookup_variants(raw):
            q |= Q(username=v) | Q(phone_number=v) | Q(username__iexact=v)
        qs = User.objects.filter(q).distinct().order_by("pk")
        n = qs.count()
        self.stdout.write(f"Matches for login/phone like {raw!r} (incl. +/- variants): {n}")
        for u in qs:
            self.stdout.write(
                f"  id={u.pk} username={u.username!r} phone_number={u.phone_number!r} email={u.email!r} role={u.role}"
            )
        if n == 0:
            self.stdout.write("No rows — try the exact string your app sends, or search in admin by user id.")
