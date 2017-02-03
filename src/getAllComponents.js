import { routerHookPropName } from './constants';

function pushComponent(acc, component) {
  if (!component) {
    return;
  }
  if (typeof component === 'object') {
    Object.keys(component).forEach(key => pushComponent(acc, component[key]));
    return;
  }
  if (component[routerHookPropName]) {
    acc.push(component);
  }
}

export default function getAllComponents(components) {
  const arr = Array.isArray(components) ? components : [components];
  const result = [];
  for (let i = 0, total = arr.length; i < total; i += 1) {
    pushComponent(result, arr[i]);
  }
  return result;
}
