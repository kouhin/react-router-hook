import { routerHookPropName } from './routerHook';

export default function getAllComponents(components) {
  const arr = Array.isArray(components) ? components : [components];
  const result = [];
  const pushComponent = (c => c && c[routerHookPropName] && result.push(c));
  arr.forEach(component => {
    if (typeof component === 'object') {
      Object.keys(component).forEach(key => pushComponent(component[key]));
    } else {
      pushComponent(component);
    }
  });
  return result;
}
