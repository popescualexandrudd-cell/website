-- The monitoring's database server holds two databases: GlitchTip's (created by the image,
-- POSTGRES_DB) and Umami's, created here once, at the first start (ADR-0017).
CREATE DATABASE umami OWNER monitoring;
