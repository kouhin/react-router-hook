react-router-hook
=========================

Universal data fetching and lifecycle management for react-router@3 with multiple components. Inspired by [redial](https://github.com/markdalgleish/redial), [react-router-redial](https://github.com/dlmr/react-router-redial) and [async props](https://github.com/ryanflorence/async-props).

[![CircleCI](https://circleci.com/gh/kouhin/react-router-hook.svg?style=svg)](https://circleci.com/gh/kouhin/react-router-hook)
[![dependency status](https://david-dm.org/kouhin/react-router-hook.svg?style=flat-square)](https://david-dm.org/kouhin/react-router-hook)

## Installation

```
npm install --save react-router-hook
```

## Usage

```javascript
import { browserHistory, Router, applyRouterMiddleware } from 'react-router';
import { useRouterHook, routerHooks } from 'react-router-hook';

const locals = {
  dispatch: store.dispatch, // redux store and dispatch, you can use any locals
  getState: store.getState,
};

const onAborted = () => {
  console.info('aborted');
};
const onCompleted = () => {
  console.info('completed');
};
const onError = (error) => {
  console.error(error);
};

const routerHookMiddleware = useRouterHook({
  locals,
  routerWillEnterHooks: ['fetch'],
  routerDidEnterHooks: ['defer', 'done'],
  onAborted,
  onStarted,
  onCompleted,
  onError,
});

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
import { triggerHooksOnServer } from 'react-router-hook';
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
    const locals = {
      dispatch: store.dispatch,
      getState: store.getState,
    };
    triggerHooksOnServer(
      renderProps,
      ['fetch', 'defer'],
      {
        dispatch,
        getState,
      },
      // If onComponentError is null, callback will be immediately called with the error
      onComponentError: (err) => {
        console.error(err.Component, err.error);
      },
      // triggerHooksOnServer() will return a Promise if there is no callback
      (err) => {
        if (err) {
          res.status(500).end();
          return;
        }
        const body = ReactDOMServer.renderToString(
          <Provider store={store}>
            <RouterContext {...renderProps} />
          </Provider>,
        );
        res.send(`<html><head></head><body>${body}</body>`);
      },
  });
});
triggerHooksOnServer
```

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
