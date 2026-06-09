const WHATSAPP_NUMBER = "5500000000000";

const status = document.querySelector("[data-my-bookings-status]");
const list = document.querySelector("[data-my-bookings-list]");
const intro = document.querySelector(".panel > p");
const whatsappLink = document.querySelector("[data-my-bookings-whatsapp]");

function setStatus(message, type = "info") {
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

function getWhatsappUrl() {
  const message = [
    "Olá, Invictus Barber.",
    "Perdi meu link de cancelamento e preciso de ajuda com meu agendamento."
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function extractConfirmationCode(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    const url = new URL(rawValue, window.location.href);
    return String(url.searchParams.get("token") || rawValue).trim();
  } catch (error) {
    return rawValue;
  }
}

function getCancellationUrl(code) {
  const url = new URL("cancelamento.html", window.location.href);
  url.searchParams.set("token", code);
  return url.toString();
}

function renderSecureGuidance() {
  if (intro) {
    intro.textContent = "Use o link da sua reserva para consultar ou cancelar.";
  }

  setStatus(
    "Por segurança, não consultamos agendamentos apenas pelo WhatsApp.",
    "info"
  );

  if (list) {
    list.innerHTML = `<div class="empty-state">
      <strong>LINK DA RESERVA</strong>
      <span>Cole abaixo o link ou c&oacute;digo recebido na confirma&ccedil;&atilde;o.</span>
      <form class="confirmation-access-form" data-confirmation-access-form novalidate>
        <label>
          Link ou c&oacute;digo
          <input name="confirmationCode" type="text" placeholder="Cole o link ou c&oacute;digo" autocomplete="off" spellcheck="false" required />
        </label>
        <button type="submit">ACESSAR AGENDAMENTO</button>
      </form>
      <span>Perdeu o link? Fale com a barbearia.</span>
    </div>`;
  }

  if (whatsappLink) {
    whatsappLink.href = getWhatsappUrl();
  }
}

renderSecureGuidance();

const confirmationForm = document.querySelector("[data-confirmation-access-form]");
if (confirmationForm) {
  confirmationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const code = extractConfirmationCode(confirmationForm.elements.confirmationCode.value);
    if (!code) {
      setStatus("Cole seu link ou código de confirmação para acessar seu agendamento.", "error");
      return;
    }

    window.location.href = getCancellationUrl(code);
  });
}
