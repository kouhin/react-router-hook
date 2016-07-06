import React from 'react';
import { routerHookPropName } from './routerHooks';
import getAllComponents from './getAllComponents';

export default class RouterHookContext extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
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

  static defaultProps = {
    locals: {},
    routerDidEnterHooks: [],
    routerWillEnterHooks: [],
    onAborted: () => null,
    onCompleted: () => null,
    onError: () => null,
    onStarted: () => null,
  };

  static childContextTypes = {
    routerHookContext: React.PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
    this.componentsProps = new WeakMap();
    this.setComponentProps = this.setComponentProps.bind(this);
    this.getComponentProps = this.getComponentProps.bind(this);
    this.reloadComponent = this.reloadComponent.bind(this);
    this.reloadAllComponents = this.reloadAllComponents.bind(this);
  }

  getChildContext() {
    return {
      routerHookContext: {
        setComponentProps: this.setComponentProps,
        getComponentProps: this.getComponentProps,
        reloadComponent: this.reloadComponent,
        reloadAllComponents: this.reloadAllComponents,
      },
    };
  }

  componentDidMount() {
    this.reloadAllComponents();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location === this.props.location) {
      return;
    }
    if (this.state.loading) {
      this.props.onAborted();
    }
    this.componentsProps = new WeakMap();
    this.reloadAllComponents();
  }

  setComponentProps(Component) {
    return props => {
      this.componentsProps.set(Component, {
        ...(this.componentsProps.get(Component) || {}),
        ...props,
      });
    };
  }

  getComponentProps(Component) {
    return () => {
      const props = this.componentsProps.get(Component);
      if (!props) {
        this.setComponentProps(Component)({ loading: false });
        return this.componentsProps.get(Component);
      }
      return props;
    };
  }

  getLocals(Component) {
    const {
      location,
      params,
    } = this.props;
    const locals = (typeof this.props.locals === 'function')
      ? this.props.locals(Component) : this.props.locals;
    return {
      ...locals,
      location,
      params,
      setProps: this.setComponentProps(Component),
      getProps: this.getComponentProps(Component),
    };
  }

  reloadComponent(Component) {
    if (!Component || !Component[routerHookPropName]) {
      return null;
    }
    const routerHooks = Component[routerHookPropName];
    const locals = this.getLocals(Component);
    const willEnterHooks = this.props.routerWillEnterHooks
      .map(key => routerHooks[key])
      .filter(f => f);
    const didEnterHooks = this.props.routerDidEnterHooks
      .map(key => routerHooks[key])
      .filter(f => f);

    const setProps = this.setComponentProps(Component);
    setProps({
      loading: true,
    });
    const willEnterHooksPromise = willEnterHooks.length < 1
      ? Promise.resolve() : willEnterHooks.reduce(
        (total, current) => total.then(() => current(locals))
        , Promise.resolve()).then(() => {
          setProps({
            loading: false,
          });
        });
    return didEnterHooks.length < 1
      ? willEnterHooksPromise : didEnterHooks.reduce(
        (total, current) => total.then(() => current(locals))
        , willEnterHooksPromise).then(() => {
        });
  }

  reloadAllComponents() {
    this.setState({
      loading: true,
    }, () => {
      this.props.onStarted();
      const promises = getAllComponents(this.props.components)
        .map(this.reloadComponent);
      Promise.all(promises)
        .then(() => {
          this.setState({
            loading: false,
          });
          this.props.onCompleted();
        })
        .catch(err => {
          this.setState({
            loading: false,
          });
          this.props.onError(err);
        });
    });
  }

  render() {
    return this.props.children;
  }
}
