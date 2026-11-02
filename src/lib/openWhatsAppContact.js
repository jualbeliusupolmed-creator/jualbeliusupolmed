"use client";

export function openWhatsAppContact(listingId, message) {
  if (typeof window === "undefined" || !listingId || !message) return false;
  const target = `jb-contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const popup = window.open("about:blank", target);
  if (!popup) return false;
  popup.opener = null;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/chat-wa/${encodeURIComponent(listingId)}`;
  form.target = target;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "message";
  input.value = String(message).slice(0, 1000);
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
  return true;
}
