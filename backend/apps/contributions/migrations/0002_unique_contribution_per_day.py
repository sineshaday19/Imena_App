from django.db import migrations, models


def dedupe_contributions(apps, schema_editor):
    Contribution = apps.get_model("contributions", "Contribution")
    from django.db.models import Count

    dups = (
        Contribution.objects.values("rider_id", "cooperative_id", "date")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )
    for row in dups:
        qs = Contribution.objects.filter(
            rider_id=row["rider_id"],
            cooperative_id=row["cooperative_id"],
            date=row["date"],
        ).order_by("id")
        keep_id = qs.values_list("id", flat=True).first()
        qs.exclude(pk=keep_id).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("contributions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(dedupe_contributions, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="contribution",
            constraint=models.UniqueConstraint(
                fields=("rider", "cooperative", "date"),
                name="unique_contribution_per_rider_coop_day",
            ),
        ),
    ]
