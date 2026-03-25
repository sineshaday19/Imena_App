from django.db import migrations


def _digits(s):
    return "".join(c for c in (s or "") if c.isdigit())


def normalize_phone_numbers(apps, schema_editor):
    User = apps.get_model("users", "User")
    for u in User.objects.iterator():
        fields = []
        pn = u.phone_number or ""
        d = _digits(pn)
        if len(d) == 10:
            new_pn = d
        elif len(d) > 10:
            new_pn = d[-10:]
        else:
            new_pn = None
        if new_pn and new_pn != pn:
            u.phone_number = new_pn
            fields.append("phone_number")
        un = u.username or ""
        if "@" not in un:
            ud = _digits(un)
            if len(ud) == 10:
                new_un = ud
            elif len(ud) > 10:
                new_un = ud[-10:]
            else:
                new_un = None
            if new_un and new_un != un:
                u.username = new_un
                fields.append("username")
        if fields:
            u.save(update_fields=fields)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_remove_user_phone_user_phone_number"),
    ]

    operations = [
        migrations.RunPython(normalize_phone_numbers, migrations.RunPython.noop),
    ]
