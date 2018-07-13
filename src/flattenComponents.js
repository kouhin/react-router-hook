function pushComponent(acc, component) {
  if (!component) {
    return;
  }
  if (typeof component === 'object') {
    Object.keys(component).forEach(key => pushComponent(acc, component[key]));
    return;
  }
  acc.push(component);
}

export default function flattenComponents(components) {
  const arr = Array.isArray(components) ? components : [components];
  const result = [];
  for (let i = 0, total = arr.length; i < total; i += 1) {
    pushComponent(result, arr[i]);
  }
  return result;
}
