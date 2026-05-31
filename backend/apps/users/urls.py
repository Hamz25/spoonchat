from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,   # POST /auth/login/  → returns access + refresh
    TokenRefreshView,      # POST /auth/refresh/ → returns new access token
)
from .views import RegisterView, ProfileView, PublicKeyUpdateView, UserSearchView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/public_key/', PublicKeyUpdateView.as_view(), name='public_key'),
    path('users/search/', UserSearchView.as_view(), name='user_search'),
]