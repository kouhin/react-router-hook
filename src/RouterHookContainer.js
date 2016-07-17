import React from 'react';
import { selectProps, selectStatus } from './routerModule';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
    location: React.PropTypes.object.isRequired,
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

  shouldComponentUpdate(nextProps, nextState) {
    return this.props !== nextProps ||
      this.state.routerLoading !== nextState.routerLoading ||
      this.state.componentStatus !== nextState.componentStatus;
  }

  componentWillUnmount() {
    this.tryUnsubscribe();
    this.clearCache();
  }

  trySubscribe() {
    if (!this.unsubscribe) {
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
      storeState,
      componentProps: selectProps(storeState, this.Component),
      componentStatus: selectStatus(storeState, this.Component),
      routerLoading: storeState.routerLoading,
    });
  }

  render() {
    this.hasStoreStateChanged = false;
    const {
      componentProps = {},
      componentStatus,
      routerLoading,
    } = this.state;

    const { reloadComponent } = this.context.routerHookContext;
    const {
      children, // eslint-disable-line no-unused-vars
      ...restProps,
    } = this.props;

    if (componentStatus !== 'init') {
      this.prevChildren = React.cloneElement(this.props.children, {
        ...restProps,
        ...componentProps,
      });
    }

    return React.cloneElement(this.prevChildren, {
      componentStatus,
      reloadComponent: () => reloadComponent(this.Component),
      routerLoading,
    });
  }
}
