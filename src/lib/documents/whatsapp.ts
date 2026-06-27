export function whatsappPhone(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return digits.length === 10 ? `91${digits}` : digits;
}

export function openWhatsAppText(phone: string, text: string) {
  const normalized = whatsappPhone(phone);
  const url = normalized
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

type SharePdfOptions = {
  filename: string;
  blob: Blob;
  phone: string;
  message: string;
};

export async function sharePdfWithWhatsApp({ filename, blob, phone, message }: SharePdfOptions) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const shareData = { files: [file], text: message };

  if (typeof navigator !== "undefined" && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  openWhatsAppText(phone, `${message}\n\n(PDF downloaded — please attach it in WhatsApp.)`);
}
