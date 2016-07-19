import React from 'react';
import RouterHookContext from './RouterHookContext';
import RouterHookContainer from './RouterHookContainer';
import getInitStatus from './getInitStatus';

export default function useRouterHook(options) {
  return {
    renderRouterContext: (child, renderProps) => (
      <RouterHookContext
        {...renderProps}
        {...options}
      >
        {child}
      </RouterHookContext>
    ),
    renderRouteComponent: (child, renderProps) => (
      <RouterHookContainer
        {...renderProps}
        initStatus={getInitStatus(child.type, options.routerWillEnterHooks)}
      >
        {child}
      </RouterHookContainer>
    ),
  };
}
