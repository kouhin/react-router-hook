import map from 'async/map';
import eachSeries from 'async/eachSeries';
import asyncify from 'async/asyncify';
import getAllComponents from './getAllComponents';
import { routerHookPropName } from './constants';

export default function triggerHooksOnServer(
  renderProps,
  hooks = [],
  locals,
  {
    onComponentError = null,
  },
  callback,
) {
  const args = {
    ...renderProps,
    ...locals,
  };

  const components = getAllComponents(renderProps.components);

  const run = (asyncCallback) => {
    map(components, (component, cb) => {
      const routerHooks = component[routerHookPropName];
      if (!routerHooks) {
        cb();
        return;
      }
      const runHooks = hooks.map(key => routerHooks[key]).filter(f => f);
      if (runHooks.length < 1) {
        cb();
        return;
      }
      eachSeries(runHooks, (hook, hookCb) => {
        asyncify(hook)(args, hookCb);
      }, (err) => {
        if (err && onComponentError) {
          onComponentError({ Component: component, error: err });
          cb();
          return;
        }
        cb(err);
      });
    }, (err) => {
      asyncCallback(err);
    });
  };

  if (callback) {
    run(callback);
    return null;
  }
  return new Promise((resolve, reject) => {
    run((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
