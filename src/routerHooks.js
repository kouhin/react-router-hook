export const routerHookPropName = '@@react-router-hook';

export const routerHooks = hooks => Component => {
  Component[routerHookPropName] = hooks;
};
