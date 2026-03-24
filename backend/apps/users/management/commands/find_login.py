from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "List users where username or phone_number equals the given value."

    def add_arguments(self, parser):
        parser.add_argument("value", type=str)

    def handle(self, *args, **options):
        raw = (options["value"] or "").strip()
        if not raw:
            self.stderr.write("Empty value.")
            return
        qs = User.objects.filter(username=raw) | User.objects.filter(phone_number=raw)
        qs = qs.distinct()
        n = qs.count()
        self.stdout.write(f"Matches for username=={raw!r} OR phone_number=={raw!r}: {n}")
        for u in qs:
            self.stdout.write(
                f"  id={u.pk} username={u.username!r} phone_number={u.phone_number!r} email={u.email!r} role={u.role}"
            )
        if n == 0:
            self.stdout.write("No rows (check formatting, e.g. +250… vs 078…).")
