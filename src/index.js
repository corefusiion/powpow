import { DotPal } from './element.js';

export { DotPal, MOODS, AGENT_STATES, bubbleContent } from './element.js';
export { characters, registerCharacter, PAGE_MASCOTS } from './characters.js';
export { buildCharacter, registerCustom, cleanCustom, CUSTOM_OPTIONS, DEFAULT_CUSTOM } from './custom.js';
export { actions, registerAction } from './actions.js';
export { connectAgent, agentHandler, toAgentState } from './agent.js';

/**
 * Register the custom element. Called automatically with the default
 * `dot-pal` tag when this module is imported in a browser.
 */
export function define(tag = 'dot-pal') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  customElements.define(tag, tag === 'dot-pal' ? DotPal : class extends DotPal {});
}

define();
