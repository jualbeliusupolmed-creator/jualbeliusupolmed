-- Migration: WhatsApp Multi-Channel Architecture (Channels, Business Gateway, Groups)
-- Adds 'whatsapp_group' to organization_social_accounts provider check

alter table public.organization_social_accounts
  drop constraint if exists organization_social_accounts_provider_check;

alter table public.organization_social_accounts
  add constraint organization_social_accounts_provider_check
  check (provider in ('instagram', 'whatsapp_channel', 'whatsapp_business', 'whatsapp_group'));

comment on constraint organization_social_accounts_provider_check on public.organization_social_accounts
  is 'Supported social and multi-channel communication providers: Instagram, WhatsApp Channels (Broadcast/Newsletter), WhatsApp Business Gateway (Transaksional/OTP), and WhatsApp Community Groups.';

