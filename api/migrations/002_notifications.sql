-- Каналы доставки уведомлений: Telegram чат-айди и username клиента.
-- Заполняется когда клиент впервые жмёт /start у бота по deep-link с его clientId.

ALTER TABLE clients
    ADD COLUMN telegram_chat_id   TEXT,
    ADD COLUMN telegram_username  TEXT;

CREATE INDEX idx_clients_telegram_chat_id
    ON clients(telegram_chat_id)
    WHERE telegram_chat_id IS NOT NULL;
