import getAllComponents from './getAllComponents';
import { routerHookPropName } from './routerHooks';

export default function triggerHooksOnServer(renderProps, hooks = [], locals) {
  const componentsProps = new Map();
  const components = getAllComponents(renderProps.components);

  function setComponentProps(Component) {
    return props => {
      componentsProps.set(Component, {
        ...(componentsProps.get(Component) || {}),
        ...props,
      });
    };
  }

  function getComponentProps(Component) {
    return () => {
      const props = componentsProps.get(Component);
      if (!props) {
        setComponentProps(Component)({ loading: false });
        return componentsProps.get(Component);
      }
      return props;
    };
  }

  function getLocals(Component) {
    const {
      location,
      params,
    } = renderProps;
    const resultLocals = (typeof locals === 'function')
      ? locals(Component) : locals;
    return {
      ...resultLocals,
      location,
      params,
      setProps: setComponentProps(Component),
      getProps: getComponentProps(Component),
    };
  }
  const promises = components.map(Component => {
    const routerHooks = Component[routerHookPropName];
    const finallocals = getLocals(Component);
    return hooks
      .map(k => routerHooks[k])
      .filter(f => f)
      .reduce((total, current) => total.then(() => current(finallocals))
      , Promise.resolve());
  });
  return Promise.all(promises).then(() => componentsProps);
}
