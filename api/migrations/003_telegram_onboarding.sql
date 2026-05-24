-- One-time onboarding tokens for Telegram bot binding.
-- Replaces the insecure clientId-as-deep-link scheme: now PM generates
-- a short-lived token via API and the client uses it exactly once.
CREATE TABLE IF NOT EXISTS client_telegram_onboarding (
  token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cto_client ON client_telegram_onboarding(client_id);
