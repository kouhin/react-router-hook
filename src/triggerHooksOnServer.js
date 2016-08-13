import getAllComponents from './getAllComponents';
import { routerHookPropName } from './constants';

export default function triggerHooksOnServer(renderProps, hooks = [], locals, {
  onComponentError = err => { throw err; },
}) {
  const args = {
    ...renderProps,
    ...locals,
  };

  const promises = getAllComponents(renderProps.components)
    .map(component => {
      const routerHooks = component[routerHookPropName];
      const runHooks = hooks.map(key => routerHooks[key]).filter(f => f);
      return runHooks.reduce(
        (total, current) => total.then(() => current(args))
        , Promise.resolve())
        .catch(err => onComponentError({ Component: component, error: err }));
    });
  return Promise.all(promises);
}
