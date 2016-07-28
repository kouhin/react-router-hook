import React from 'react';

import configureStore from './configureStore';
import { reloadAllComponents, reloadComponent } from './routerModule';

export default class RouterHookContext extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    components: React.PropTypes.array.isRequired,
    locals: React.PropTypes.object,
    location: React.PropTypes.object.isRequired,
    params: React.PropTypes.object,
    routerDidEnterHooks: React.PropTypes.array,
    routerWillEnterHooks: React.PropTypes.array,
    onAborted: React.PropTypes.func,
    onCompleted: React.PropTypes.func,
    onError: React.PropTypes.func,
    onStarted: React.PropTypes.func,
  };

  static get defaultProps() {
    return {
      locals: {},
      routerDidEnterHooks: [],
      routerWillEnterHooks: [],
      onAborted: () => {},
      onCompleted: () => {},
      onError: () => {},
      onStarted: () => {},
    };
  }

  static childContextTypes = {
    routerHookContext: React.PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.store = configureStore({
      ...props.locals,
      routerDidEnterHooks: props.routerDidEnterHooks,
      routerWillEnterHooks: props.routerWillEnterHooks,
      onAborted: props.onAborted,
      onCompleted: props.onCompleted,
      onError: props.onError,
      onStarted: props.onStarted,
    });
    this.reloadComponent = component => this.store.dispatch(reloadComponent(component, this.props));
    this.reloadAllComponents = (components, renderProps) =>
      this.store.dispatch(reloadAllComponents(components, renderProps));
  }

  getChildContext() {
    return {
      routerHookContext: {
        dispatch: this.store.dispatch,
        getState: this.store.getState,
        subscribe: this.store.subscribe,
        reloadComponent: this.reloadComponent,
        reloadAllComponents: this.reloadAllComponents,
      },
    };
  }

  componentDidMount() {
    this.reloadAllComponents(this.props.components, this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location === this.props.location) {
      return;
    }
    this.reloadAllComponents(nextProps.components, nextProps);
  }

  render() {
    return this.props.children;
  }
}
