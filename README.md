react-router-hook
=========================

Universal data fetching and lifecycle management for react-router 2, 3, 4 (and may support other router libraries) with multiple components.

Inspired by [redial](https://github.com/markdalgleish/redial), [react-router-redial](https://github.com/dlmr/react-router-redial) and [async props](https://github.com/ryanflorence/async-props).

[![CircleCI](https://circleci.com/gh/kouhin/react-router-hook.svg?style=svg)](https://circleci.com/gh/kouhin/react-router-hook)
[![dependency status](https://david-dm.org/kouhin/react-router-hook.svg?style=flat-square)](https://david-dm.org/kouhin/react-router-hook)

## Installation

```
npm install --save react-router-hook
```

## Usage

```javascript
import { browserHistory, Router, applyRouterMiddleware } from 'react-router';
import { createHookStore, useRouterHook, routerHooks } from 'react-router-hook';

const triggerConfig = {
  store: createHookStore(),
  locals: {
    dispatch: store.dispatch, // redux store and dispatch, you can use any locals
    getState: store.getState,
  },
  hookNames: ['fetch', 'defer', 'done'],
  onError: ({Component, error}) => console.error(Component, error),
  version: browserHistory.location.pathname
};

const routerHookMiddleware = useRouterHook(triggerConfig);

ReactDOM.render((
  <Router
    history={browserHistory}
    render={applyRouterMiddleware(routerHookMiddleware))}
  >
    <Route path="/" component={App}>
      <Route path="users" components={{main: Users, footer: lazy({ style: { height: 500 } })(UserFooter)}} />
    </Route>
  </Router>
), node)
class App extends React.Component {
  render() {
    // the matched child route components become props in the parent
    return (
      <div>
        <div className="Main">
          {/* this will either be <Groups> or <Users> */}
          {this.props.main}
        </div>
        <div className="Footer">
          {/* this will either be <GroupsSidebar> or <UsersSidebar> */}
          {this.props.footer}
        </div>
      </div>
    )
  }
}

@routerHooks({
  fetch: async () => {
    await fetchData();
  },
  defer: async () => {
    await fetchDeferredData();
  },
})
class Users extends React.Component {
  render() {
    return (
      <div>
        {/* if at "/users/123" this will be <Profile> */}
        {/* UsersSidebar will also get <Profile> as this.props.children.
            You can pick where it renders */}
        {this.props.children}
      </div>
    )
  }
}

@routerHook({
  fetch: async () => {
    await fetchData();
  },
  defer: async () => {
    await fetchDeferredData();
  },
})
class UserFooter extends React.Component {
  render() {
    return (
      <div>
        UserFooter
      </div>
    )
  }
}
```

## On server side

``` javascript

import { match } from 'react-router';
import { flattenComponents, createHookStore, RouterHookProvider, triggerHooks } from 'react-router-hook';
// Other imports

import routes from './routes';

app.get('*', (req, res) => {
  // create redux store (Optional);
  const store = createStore();

  match({
    history,
    routes,
    location: req.url,
  }, (err, redirectLocation, renderProps) => {
    if (err) {
      // Error Handler
    }
    const triggerConfig = {
      store: createHookStore(),
      locals: {
        dispatch: store.dispatch, // redux store and dispatch, you can use any locals
        getState: store.getState,
      },
      hookNames: ['fetch', 'defer'], // Only run fetch and defer on server-side
      onError: ({Component, error}) => console.error(Component, error),
    };

    triggerHooks(
      flattenComponents(renderProps.components),
      triggerConfig
    ).then(() => {
      const body = ReactDOMServer.renderToString(
        <Provider store={store}>
          <RouterHookProvider value={{triggerConfig: triggerConfig, version: renderProps.location.pathname}}>
            <RouterContext {...renderProps} />
          </RouterHookProvider>
        </Provider>,
      );
      res.send(`<html><head></head><body>${body}</body>`);
    });
  });
});
```

## API

`TriggerConfig`

``` javascript
PropTypes.shape({
  hookNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  locals: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired,
  onError: PropTypes.func
})
```



### `createHookStore(initState): Store`

An alias of unistore/createStore.

### `RouterHookProvider(value)`

Value must be: `{triggerConfig: TriggerConfig, version: String}`

### `RouterHookConsumer`

### `@routerHooks(hooks: Object, options: Object)`

`options`:

  - `preventUpdateOnLoad`: [Boolean], default: true. Whether prevent re-render when hooks are running.
  - `exposeLoading`: [Boolean], default: false. When it's true, `loading` will be exposed to wrapped component as prop.
  - `exposeReloadComponent`: [Boolean], default: false. When it's true, `reloadComponent` will be exposed to wrapped component as prop.

### `triggerHooks(components, triggerConfig, version, [force = true])`

### `flatternComponents(components)` A helper for react-router@3

### `useRouterHook(triggerConfig)` A helper for react-router@3

## Monitoring router status

``` javascript

@routerHook({
  fetch: async () => {
    await fetchData();
  },
  defer: async () => {
    await fetchDeferredData();
  },
})
class SomeComponent extends React.Component{

  static contextTypes = {
    routerHookContext: routerHookContextShape,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      routerLoading: false,
    };
  }

  componentWillMount() {
    if (this.context.routerHookContext) {
      this.removeListener = this.context.routerHookContext.addLoadingListener((loading, info) => {
        const { total, init, defer, done } = info;
        console.info(loading, total, init, defer, done);
        this.setState({
          routerLoading: loading,
        });
      });
    }
  }

  componentWillUnmount() {
    if (this.removeListener) {
      this.removeListener();
    }
  }

  render() {
    return (
      <div>
        is loading: {this.state.routerLoading}
      </div>
    );
  }
}
```
