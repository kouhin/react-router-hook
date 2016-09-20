import React from 'react';
import RouterHookContext from './RouterHookContext';
import RouterHookContainer from './RouterHookContainer';

export default function useRouterHook(options) {
  const context = <RouterHookContext />;
  const container = <RouterHookContainer />;
  return {
    renderRouterContext: (child, renderProps) => (
      React.cloneElement(context, {
        ...renderProps,
        ...options,
      }, child)
    ),
    renderRouteComponent: (child, renderProps) => (
      React.cloneElement(container, renderProps, child)
    ),
  };
}
