from django.contrib import admin

from jungle.blog.models import Article
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(Article, site=emergency_admin_site)
class ArticleAdmin(ReadOnlyAdmin):
    list_display = ("title_ro", "slug", "published", "first_published_at", "updated_at")
    list_filter = ("published", "location")
    search_fields = ("title_ro", "title_en", "slug")
