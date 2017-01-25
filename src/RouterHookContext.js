import React from 'react';
import setImmediate from 'async/setImmediate';
import throttle from 'lodash/throttle';
import { ComponentStatus } from './constants';
import getAllComponents from './getAllComponents';

export default class RouterHookContext extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    components: React.PropTypes.arrayOf(React.PropTypes.node).isRequired,
    locals: React.PropTypes.object,
    location: React.PropTypes.object.isRequired,
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
    this.componentStatuses = new WeakMap();
    this.setComponentStatus = this.setComponentStatus.bind(this);
    this.getComponentStatus = this.getComponentStatus.bind(this);
    this.updateRouterLoading = throttle(this.updateRouterLoading, 100).bind(this);
    this.loading = false;
    this.state = {
      routerLoading: this.loading,
    };
  }

  getChildContext() {
    return {
      routerHookContext: {
        components: this.props.components,
        getComponentStatus: this.getComponentStatus,
        routerLoading: this.state.routerLoading,
        locals: this.props.locals,
        routerDidEnterHooks: this.props.routerDidEnterHooks,
        routerWillEnterHooks: this.props.routerWillEnterHooks,
        setComponentStatus: this.setComponentStatus,
      },
    };
  }

  componentDidMount() {
    this.props.onStarted();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location === this.props.location) {
      return;
    }
    if (this.loading) {
      this.props.onAborted();
    }
  }

  setComponentStatus(Component, status, err) {
    setImmediate(() => {
      this.componentStatuses.set(Component, status);
      this.updateRouterLoading();
      if (err) {
        this.props.onError({ Component, error: err });
      }
    });
  }

  getComponentStatus(Component) {
    return this.componentStatuses.get(Component);
  }

  updateRouterLoading() {
    const loading = (() => {
      const components = getAllComponents(this.props.components);
      for (let i = 0, length = components.length; i < length; i += 1) {
        const status = this.componentStatuses.get(components[i]);
        if (status && status !== ComponentStatus.DONE) {
          return true;
        }
      }
      return false;
    })();
    if (this.loading !== loading) {
      this.loading = loading;
      if (!loading) {
        this.props.onCompleted();
      }
      setImmediate(() => {
        this.setState({
          routerLoading: this.loading,
        });
      });
    }
  }

  render() {
    return this.props.children;
  }
}
