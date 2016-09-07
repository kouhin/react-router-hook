import React from 'react';
import update from 'react-addons-update';
import Debug from 'debug';
import { ComponentStatus, routerHookPropName } from './constants';
import getInitStatus from './getInitStatus';

const debug = new Debug('react-router-hook:RouterHookContainer');
const ABORT = 'abort';

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
    this.Component = this.props.children.type;
    this.reportStatus = this.reportStatus.bind(this);
    this.reloadComponent = this.reloadComponent.bind(this);

    const initStatus = getInitStatus(
      this.Component,
      context.routerHookContext.routerWillEnterHooks
    );
    this.state = {
      status: initStatus,
      childProps: {},
    };
  }

  componentWillMount() {
    this.reportStatus(this.state.status);
  }

  componentDidMount() {
    this.reloadComponent(true);
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (this.props.children.type !== nextProps.children.type) {
      this.Component = nextProps.children.type;
      const initStatus = getInitStatus(
        this.Component,
        nextContext.routerHookContext.routerWillEnterHooks
      );
      this.setState({
        status: initStatus,
        childProps: {},
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.location !== prevProps.location) {
      this.reloadComponent(true);
    }
  }

  reportStatus(status, err) {
    if (!status) {
      throw new Error('Status is undefined', this.Component.displayName, status);
    }
    this.context.routerHookContext.setComponentStatus(this.Component, status, err);
  }

  reloadComponent(shouldReportStatus = false) {
    const start = Date.now();
    const {
      locals,
      routerDidEnterHooks,
      routerWillEnterHooks,
    } = this.context.routerHookContext;

    const initStatus = getInitStatus(
      this.Component,
      this.context.routerHookContext.routerWillEnterHooks
    );

    if (shouldReportStatus) {
      this.reportStatus(initStatus);
    }

    if (initStatus === ComponentStatus.DONE) {
      return Promise.resolve();
    }

    const routerHooks = this.Component[routerHookPropName];

    // eslint-disable-next-line no-unused-vars
    const { children, ...restProps } = this.props;
    const location = this.props.location;

    const args = {
      ...restProps,
      ...locals,
      getProps: () => this.state.childProps,
      setProps: p => {
        if (location === this.props.location) {
          this.setState(update(this.state, {
            childProps: {
              $merge: p,
            },
          }));
        }
      },
    };

    return Promise.resolve()
      .then(() => {
        if (location !== this.props.location) {
          return Promise.reject(ABORT);
        }
        if (initStatus === 'init') {
          return Promise.resolve();
        }
        const willEnterHooks = routerWillEnterHooks
          .map(key => routerHooks[key])
          .filter(f => f);
        return willEnterHooks.reduce(
          (total, current) => total.then(() => (
            location === this.props.location ? current(args) : Promise.resolve()
          )), Promise.resolve());
      })
      .then(() => {
        if (location !== this.props.location) {
          return Promise.reject(ABORT);
        }
        if (shouldReportStatus) {
          this.reportStatus(ComponentStatus.DEFER);
        }
        return this.setState(update(this.state, {
          status: {
            $set: ComponentStatus.DEFER,
          },
        }));
      })
      .then(() => {
        if (location !== this.props.location) {
          return Promise.reject(ABORT);
        }
        const didEnterHooks = routerDidEnterHooks
          .map(key => routerHooks[key])
          .filter(f => f);
        return didEnterHooks.reduce(
          (total, current) => total.then(() => (
            location === this.props.location ? current(args) : Promise.resolve()
          ))
          , Promise.resolve());
      })
      .then(() => {
        if (location !== this.props.location) {
          return Promise.reject(ABORT);
        }
        if (shouldReportStatus) {
          this.reportStatus(ComponentStatus.DONE);
        }
        return this.setState(update(this.state, {
          status: {
            $set: ComponentStatus.DONE,
          },
        }));
      })
      .then(() => {
        if (debug.enabled) {
          debug(`Reloading component... finished in ${Date.now() - start} ms`, (this.Component.displayName || this.Component)); // eslint-disable-line max-len
        }
      })
      .catch(err => {
        if (err === ABORT) {
          return;
        }
        if (shouldReportStatus) {
          this.reportStatus(ComponentStatus.DONE, err);
        }
        this.setState(update(this.state, {
          status: {
            $set: ComponentStatus.DONE,
          },
        }));
      });
  }

  render() {
    const status = this.state.status;
    // eslint-disable-next-line no-unused-vars
    const { children, ...restProps } = this.props;
    const passProps = {
      ...restProps,
      ...this.state.childProps,
      componentStatus: status,
      reloadComponent: this.reloadComponent,
      routerLoading: this.context.routerHookContext.routerLoading,
    };

    if (status === ComponentStatus.INIT) {
      if (!this.prevChildren) {
        return null;
      }
      return React.cloneElement(this.prevChildren, passProps);
    }

    this.prevChildren = React.cloneElement(this.props.children, passProps);
    return this.prevChildren;
  }
}
