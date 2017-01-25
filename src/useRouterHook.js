import React from 'react';
import RouterHookContext from './RouterHookContext';
import RouterHookContainer from './RouterHookContainer';

export default function useRouterHook(options) {
  let context = null;
  let container = null;
  return {
    renderRouterContext: (child, renderProps) => {
      const opts = {
        ...renderProps,
        ...options,
      };
      if (!context) {
        context = (
          <RouterHookContext {...opts}>
            {child}
          </RouterHookContext>
        );
        return context;
      }
      return React.cloneElement(context, opts, child);
    },
    renderRouteComponent: (child, renderProps) => {
      if (!child) {
        return null;
      }
      if (!container) {
        container = (
          <RouterHookContainer {...renderProps}>
            {child}
          </RouterHookContainer>
        );
        return container;
      }
      return React.cloneElement(container, renderProps, child);
    },
  };
}
