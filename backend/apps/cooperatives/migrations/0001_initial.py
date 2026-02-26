import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Uses SeparateDatabaseAndState so:
    - Django's ORM state always knows about Cooperative + CooperativeMembership.
    - The actual SQL uses CREATE TABLE IF NOT EXISTS, meaning it is safe to run
      on a fresh database AND on a database where some tables already exist
      (e.g. created as side-effects of other apps' migrations).
    """

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Cooperative",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("name", models.CharField(max_length=255)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                        ("admins", models.ManyToManyField(blank=True, related_name="administered_cooperatives", to=settings.AUTH_USER_MODEL)),
                    ],
                    options={"db_table": "cooperatives_cooperative", "ordering": ["name"]},
                ),
                migrations.CreateModel(
                    name="CooperativeMembership",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("cooperative", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="cooperatives.cooperative")),
                        ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="cooperative_membership", to=settings.AUTH_USER_MODEL)),
                    ],
                    options={"db_table": "cooperatives_membership"},
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE TABLE IF NOT EXISTS "cooperatives_cooperative" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                        "name" varchar(255) NOT NULL,
                        "created_at" datetime NOT NULL,
                        "updated_at" datetime NOT NULL
                    );
                    CREATE TABLE IF NOT EXISTS "cooperatives_cooperative_admins" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                        "cooperative_id" integer NOT NULL REFERENCES "cooperatives_cooperative" ("id"),
                        "user_id" integer NOT NULL REFERENCES "users_user" ("id"),
                        UNIQUE ("cooperative_id", "user_id")
                    );
                    CREATE TABLE IF NOT EXISTS "cooperatives_membership" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                        "cooperative_id" integer NOT NULL REFERENCES "cooperatives_cooperative" ("id"),
                        "user_id" integer NOT NULL UNIQUE REFERENCES "users_user" ("id")
                    );
                    """,
                    reverse_sql="""
                    DROP TABLE IF EXISTS "cooperatives_membership";
                    DROP TABLE IF EXISTS "cooperatives_cooperative_admins";
                    DROP TABLE IF EXISTS "cooperatives_cooperative";
                    """,
                ),
            ],
        ),
    ]
