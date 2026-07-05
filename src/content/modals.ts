/**
 * Generic modal creation utilities for the La Home Zap content script.
 */

/**
 * Configuration for creating a modal dialog.
 */
export interface ModalConfig {
  /** Unique id for the modal wrapper */
  id: string;
  /** Title text displayed at the top of the modal */
  title: string;
  /** Title color (CSS value) */
  titleColor?: string;
  /** SVG icon HTML string (optional) */
  iconHtml?: string;
  /** Body HTML content */
  bodyHtml: string;
  /** Label for the action button */
  actionLabel: string;
  /** Action button background color (CSS value) */
  actionColor?: string;
  /** Callback when the action button is clicked */
  onAction: () => void;
}

/**
 * Creates a full-screen glassmorphism modal overlay.
 * Returns a cleanup function to remove the modal.
 */
export function createModal(config: ModalConfig): () => void {
  if (document.getElementById(config.id)) {
    return () => {};
  }

  const modalWrapper = document.createElement('div');
  modalWrapper.id = config.id;
  modalWrapper.style.position = 'fixed';
  modalWrapper.style.top = '0';
  modalWrapper.style.left = '0';
  modalWrapper.style.width = '100vw';
  modalWrapper.style.height = '100vh';
  modalWrapper.style.background = 'rgba(11, 15, 25, 0.6)';
  modalWrapper.style.backdropFilter = 'blur(10px)';
  modalWrapper.style.setProperty('-webkit-backdrop-filter', 'blur(10px)');
  modalWrapper.style.display = 'flex';
  modalWrapper.style.alignItems = 'center';
  modalWrapper.style.justifyContent = 'center';
  modalWrapper.style.zIndex = '99999';
  modalWrapper.style.fontFamily = "'Outfit', sans-serif";

  const okBtnId = `${config.id}-ok-btn`;

  modalWrapper.innerHTML = `
    <div style="
      background: #131a2e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      width: 440px;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      text-align: left;
      color: #f8fafc;
      animation: laHomeZapScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: ${config.titleColor || '#eab308'};">
        ${config.iconHtml || ''}
        <span style="font-weight: 700; font-size: 16px; text-transform: uppercase;">${config.title}</span>
      </div>

      <div style="font-size: 14px; line-height: 1.5; color: #cbd5e1; margin-bottom: 24px;">
        ${config.bodyHtml}
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button id="${okBtnId}" style="
          background: ${config.actionColor || '#10b981'};
          border: none;
          border-radius: 8px;
          color: #fff;
          padding: 10px 24px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">${config.actionLabel}</button>
      </div>
    </div>

    <style>
      @keyframes laHomeZapScaleUp {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    </style>
  `;

  document.body.appendChild(modalWrapper);

  const okBtn = document.getElementById(okBtnId);
  if (okBtn) {
    okBtn.addEventListener('click', () => {
      removeModal(config.id);
      config.onAction();
    });
  }

  return () => removeModal(config.id);
}

/**
 * Removes a modal by its id.
 */
function removeModal(id: string) {
  const el = document.getElementById(id);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Shows the "missing label" dialog with clipboard copy and native label creation flow.
 */
export function showMissingLabelDialog(
  name: string,
  onConfirm: () => void
): () => void {
  const cleanLabelName = name.endsWith(':') ? name : `${name}:`;

  return createModal({
    id: 'la-home-zap-custom-modal',
    title: 'Etiqueta não encontrada',
    titleColor: '#eab308',
    iconHtml: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    bodyHtml: `
      <p style="margin-bottom: 14px;">
        A etiqueta <strong style="color: #06b6d4;">"${cleanLabelName}"</strong> não foi encontrada no seu WhatsApp Business!
      </p>
      <p style="font-size: 13.5px; color: #94a3b8; margin-bottom: 0;">
        Crie essa etiqueta para utilizar o recurso de Controle de Atendimento. Após a criação, ela será aplicada automaticamente às conversas desse atendente, permitindo:<br>
        • Iniciar e finalizar atendimentos com 1 clique<br>
        • Identificar o responsável por cada atendimento<br>
        • Evitar que vários atendentes respondam o mesmo contato ao mesmo tempo.
      </p>
    `,
    actionLabel: 'OK',
    actionColor: '#10b981',
    onAction: onConfirm,
  });
}

/**
 * Injects keyframe styles once for collision alert animations.
 */
function ensureAlertKeyframes() {
  if (!document.getElementById('la-home-zap-alert-keyframes')) {
    const style = document.createElement('style');
    style.id = 'la-home-zap-alert-keyframes';
    style.textContent = `
      @keyframes laHomeZapFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes laHomeZapSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes laHomeZapPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Shows a glassmorphism collision alert when opening an already attended chat.
 */
export function showCollisionAlert(attendantName: string) {
  if (document.getElementById('la-home-zap-collision-alert')) {
    return;
  }

  ensureAlertKeyframes();

  const overlay = document.createElement('div');
  overlay.id = 'la-home-zap-collision-alert';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(11, 15, 25, 0.6); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 999999; animation: laHomeZapFadeIn 0.25s ease-out;
  `;

  overlay.innerHTML = `
    <div style="
      background: #0b0f19; border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 16px; padding: 24px; width: 380px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      text-align: center; font-family: 'Outfit', sans-serif;
      color: #f8fafc; animation: laHomeZapSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <div style="font-size: 40px; margin-bottom: 12px; animation: laHomeZapPulse 2s infinite; display: inline-block;">⚠️</div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; background: linear-gradient(135deg, #ef4444, #f87171); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Contato em Atendimento</h2>
      <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
        Este contato já está sob a responsabilidade de:<br>
        <strong style="color: #ffffff; font-size: 15px; display: block; margin-top: 6px; font-weight: 600; text-transform: uppercase;">👤 ${attendantName}</strong>
      </p>
      <button id="la-home-zap-collision-ok-btn" style="
        width: 100%; padding: 10px 16px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border: none; border-radius: 8px; color: #fff;
        font-weight: 600; font-size: 13.5px; cursor: pointer;
        transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
      ">Entendido</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const okBtn = overlay.querySelector('#la-home-zap-collision-ok-btn') as HTMLElement;
  if (okBtn) {
    okBtn.addEventListener('click', () => {
      overlay.style.animation = 'laHomeZapFadeIn 0.2s ease-out reverse';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 180);
    });
  }
}
