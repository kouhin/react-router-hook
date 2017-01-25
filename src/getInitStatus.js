import { routerHookPropName } from './constants';

export default function getInitStatus(component, willEnterhooks) {
  if (!component || !component[routerHookPropName]) {
    return 'done';
  }
  const hooks = component[routerHookPropName];
  for (let i = 0; i < willEnterhooks.length; i += 1) {
    if (hooks[willEnterhooks[i]]) {
      return 'init';
    }
  }
  return 'defer';
}
