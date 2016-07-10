import React from 'react';
import { routerHookPropName } from './routerHooks';
import { selectProps, selectStatus } from './routerModule';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
  }

  static contextTypes = {
    routerHookContext: React.PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.Component = props.children.type;
    this.state = {};
  }

  componentDidMount() {
    this.trySubscribe();
  }

  componentWillUnmount() {
    this.tryUnsubscribe();
    this.clearCache();
  }

  componentShouldUpdate(nextProps, nextState) {
    return nextState.componentStatus !== 'init' &&
      this.state.componentStatus !== nextState.componentStatus;
  }

  shouldSubscribe() {
    return !!this.Component && !!this.Component[routerHookPropName];
  }

  trySubscribe() {
    if (this.shouldSubscribe() && !this.unsubscribe) {
      this.unsubscribe = this.context.routerHookContext.subscribe(this.handleChange.bind(this));
      this.handleChange();
    }
  }

  tryUnsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  clearCache() {
    this.hasStoreStateChanged = null;
  }

  handleChange() {
    if (!this.unsubscribe) {
      return;
    }

    const storeState = this.context.routerHookContext.getState();
    if (!storeState) {
      console.error('storeState is empty', storeState, this.context.routerHookContext);
    }
    const prevStoreState = this.state.storeState;
    if (prevStoreState === storeState) {
      return;
    }

    this.hasStoreStateChanged = true;
    this.setState({
      componentProps: selectProps(storeState, this.Component),
      componentStatus: selectStatus(storeState, this.Component),
    });
  }

  render() {
    this.hasStoreStateChanged = false;
    const {
      componentProps = {},
      componentStatus,
    } = this.state;
    const {
      reloadComponent,
      getState,
    } = this.context.routerHookContext;
    const routerLoading = getState().routerLoading;

    if (componentStatus === 'init') {
      return null;
    }

    return React.cloneElement(this.props.children, {
      ...componentProps,
      componentStatus,
      reloadComponent,
      routerLoading,
    });
  }
}
