import delve from 'dlv';

import actions from './actions';
import { mapActions } from './storeUtils';
import noop from './noop';
import propName from './propName';

function unwrap(Component, locals) {
  return typeof locals === 'function'
    ? unwrap(Component, locals(Component))
    : locals;
}

export default function triggerHooks(component, triggerConfig, version, force) {
  const components = (Array.isArray(component)
    ? component
    : [component]
  ).filter(c => c && c[propName]);
  if (components.length < 1) {
    return Promise.resolve();
  }
  const { hookNames, locals, store, onError } = triggerConfig;
  const boundActions = mapActions(actions, store);
  const getLocals = Component => {
    const componentHooks = Component[propName];
    return {
      ...(unwrap(Component, locals) || {}),
      setProps: componentHooks
        ? props => boundActions.updateProps(componentHooks.id, props, version)
        : noop,
      getProps: componentHooks
        ? () => delve(store.getState(), [componentHooks.id, 'props'])
        : noop
    };
  };

  const promises = components
    .map(Component => {
      const componentHooks = Component[propName];
      if (!componentHooks) return null;
      const hookId = componentHooks.id;
      const runHookNames = hookNames.filter(key => componentHooks[key]);
      if (runHookNames.length < 1) return null;
      boundActions.startLoading(hookId, version);
      return runHookNames
        .reduce(
          (total, name) =>
            total.then(() => {
              if (
                !force &&
                delve(store.getState(), [hookId, 'hooks', name]) === version
              )
                return null;
              boundActions.startTriggerHook(hookId, name, version);
              return componentHooks[name](getLocals(Component));
            }),
          Promise.resolve()
        )
        .then(() => {
          boundActions.finishLoading(hookId, version);
        })
        .catch(err => {
          boundActions.finishLoading(hookId, version);
          if (onError) {
            onError({ Component, error: err });
            return;
          }
          throw err;
        });
    })
    .filter(p => p);
  return Promise.all(promises);
}
