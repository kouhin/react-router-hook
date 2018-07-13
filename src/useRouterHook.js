import React from 'react';
import { RouterHookProvider } from './context';

export default function useRouterHook(triggerConfig) {
  return {
    renderRouterContext: (child, renderProps) => (
      <RouterHookProvider
        value={{ triggerConfig, version: renderProps.location.pathname }}
      >
        {child}
      </RouterHookProvider>
    ),
    renderRouteComponent: child => child
  };
}
