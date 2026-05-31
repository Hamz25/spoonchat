# apps/users/models.py

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    public_key = models.TextField(blank=True, default='')

    last_seen = models.DateTimeField(null=True, blank=True)

    avatar = models.URLField(blank=True, default='')

    class Meta:
        db_table = 'users'
        # By default Django names the table "users_user" (app_model).
        # This overrides it to just "users" — cleaner SQL queries.

    def __str__(self):
        return self.username
        # WHY __str__?
        # When Django shows this object in the admin panel or in a
        # print() call, it calls __str__. Without it you'd see
        # "User object (3f2a1b4c...)" which is useless for debugging.