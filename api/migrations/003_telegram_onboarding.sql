-- Одноразовые токены для безопасной привязки Telegram-чата клиента.
-- Заменяют публичное использование clients.id в deep-link /start <id>:
-- теперь /start <token>, токен один раз, TTL 24ч.

CREATE TABLE client_telegram_onboarding (
    token       UUID PRIMARY KEY,
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    issued_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);

CREATE INDEX idx_client_tg_onboarding_client_id
    ON client_telegram_onboarding(client_id);

CREATE INDEX idx_client_tg_onboarding_active
    ON client_telegram_onboarding(client_id, expires_at)
    WHERE used_at IS NULL;
