// Settings → Agents: one section for every agent other than Claude Code.
// Previews exact diff, backs up before writing, and allows clean install/uninstall.

import { Bridge, type AgentHookStatus } from "../core/bridge";
import { clear, h } from "../views/dom";
import { renderDiff, statusDot } from "./parts";
import { t } from "../core/i18n";

const TEXT = {
  get title() { return t("Agentes"); },
  get intro() {
    return t("Conecte outros agentes de código na ilha. O Powpow integra-se à configuração de cada agente com backup automático e pré-visualização de diff.");
  },
  get none() { return t("Nenhum outro agente configurável encontrado no momento."); },
  get approvals() { return t("Sessões e Permitir / Negar direto da ilha"); },
  get displayOnly() { return t("Sessões — aprovações permanecem no terminal"); },
  get install() { return t("Instalar…"); },
  get reinstall() { return t("Reinstalar…"); },
  get uninstall() { return t("Desinstalar…"); },
  get relayMissing() { return t("O relay de hooks não foi encontrado. Reinicie o Powpow."); },
  previewInstall: (name: string) => t("Isso é exatamente o que muda para {name}. Nenhum outro arquivo é alterado.", { name }),
  get previewRemove() { return t("Isso remove apenas as entradas do Powpow. Suas configurações permanecem intactas."); },
  backup: (to: string) => (to ? t("Backup → {path}", { path: to }) : t("Nenhum arquivo anterior — nada para fazer backup.")),
  get confirmInstall() { return t("Fazer backup e gravar"); },
  get confirmRemove() { return t("Fazer backup e remover"); },
  get cancel() { return t("Cancelar"); },
  get back() { return t("Voltar"); },
  done: (backups: string, note: string) => {
    const saved = backups
      ? t("Concluído. Versão anterior salva como {paths}.", { paths: backups.split("\n").join(", ") })
      : t("Concluído.");
    return `${saved} ${note}`;
  },
  failed: (err: unknown) => t("Não foi possível gravar: {error}", { error: errorText(err) }),
};

function errorText(err: unknown): string {
  return String(err).replace(/^Error:\s*/, "");
}

export function agentsSection(list: AgentHookStatus[] | null): HTMLElement {
  const blocks = h("div", { style: "display:flex;flex-direction:column;gap:14px" });
  if (!list || list.length === 0) {
    blocks.append(h("div", { class: "hint", text: TEXT.none }));
  }
  for (const status of list ?? []) blocks.append(agentBlock(status));
  return h(
    "section",
    {},
    h("h2", {}, h("span", { text: TEXT.title })),
    h("div", { class: "hint", text: TEXT.intro }),
    blocks,
  );
}

function agentBlock(initial: AgentHookStatus): HTMLElement {
  let status = initial;
  const head = h("div", { class: "row" });
  const body = h("div", { style: "display:flex;flex-direction:column;gap:10px" });
  const block = h("div", { style: "display:flex;flex-direction:column;gap:8px" }, head, body);

  async function refresh() {
    const fresh = (await Bridge.agentHooksList())?.find((a) => a.id === status.id);
    if (fresh) status = fresh;
    draw();
  }

  function draw() {
    clear(head);
    clear(body);
    const install = h("button", {
      class: "primary",
      text: status.installed ? TEXT.reinstall : TEXT.install,
      onclick: () => void showPreview(true),
    });
    if (!status.hookReady) {
      install.disabled = true;
      install.title = TEXT.relayMissing;
    }
    head.append(
      h("div", { style: "display:flex;align-items:center;gap:8px;min-width:132px" },
        statusDot(status.installed),
        h("span", { style: "font-size:12.5px", text: status.name }),
      ),
      h("span", { class: "hint", text: status.approvals ? TEXT.approvals : TEXT.displayOnly }),
      h("span", { class: "spacer" }),
      install,
    );
    if (status.installed) {
      head.append(h("button", {
        class: "danger",
        text: TEXT.uninstall,
        onclick: () => void showPreview(false),
      }));
    }
    body.append(h("span", { class: "path", text: status.path }));
  }

  async function showPreview(install: boolean) {
    let plan;
    try {
      plan = await Bridge.agentHooksPreview(status.id, install);
    } catch (err) {
      clear(body);
      body.append(
        h("div", { class: "notice err", text: errorText(err) }),
        h("div", { class: "row" }, h("button", { text: TEXT.back, onclick: draw })),
      );
      return;
    }
    clear(body);
    body.append(
      h("div", { class: "hint", text: install ? TEXT.previewInstall(status.name) : TEXT.previewRemove }),
      renderDiff(plan.diff),
      h("div", { class: "row" }, h("span", { class: "path", text: TEXT.backup(plan.backup) })),
    );
    const confirm = h("button", {
      class: install ? "primary" : "danger",
      text: install ? TEXT.confirmInstall : TEXT.confirmRemove,
    });
    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      try {
        const backups = await Bridge.agentHooksApply(status.id, install, plan.fingerprint);
        clear(body);
        body.append(h("div", { class: "notice ok", text: TEXT.done(backups, install ? status.note : "") }));
        window.setTimeout(() => void refresh(), 2600);
      } catch (err) {
        confirm.disabled = false;
        body.append(h("div", { class: "notice err", text: TEXT.failed(err) }));
      }
    });
    body.append(h("div", { class: "row" }, confirm, h("button", { text: TEXT.cancel, onclick: draw })));
  }

  draw();
  return block;
}
