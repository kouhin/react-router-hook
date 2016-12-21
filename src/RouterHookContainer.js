import React from 'react';
import update from 'react-addons-update';
import setImmediate from 'async/setImmediate';
import series from 'async/series';
import asyncify from 'async/asyncify';
import mapSeries from 'async/mapSeries';

import { ComponentStatus, routerHookPropName } from './constants';
import getInitStatus from './getInitStatus';

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
    this.reportStatus = this.reportStatus.bind(this);
    this.reloadComponent = this.reloadComponent.bind(this);

    const initStatus = getInitStatus(
      props.children.type,
      context.routerHookContext.routerWillEnterHooks
    );
    this.shouldReload = false;
    this.state = {
      status: initStatus,
      childProps: {},
      lastUpdated: Date.now(),
    };
  }

  componentWillMount() {
    this.reportStatus(this.state.status);
  }

  componentDidMount() {
    setImmediate(() => {
      this.reloadComponent(true);
    });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location !== nextProps.location) {
      this.setState({
        status: getInitStatus(
            this.Component,
            this.context.routerHookContext.routerWillEnterHooks
        ),
        childProps: {},
      });
      setImmediate(() => {
        this.shouldReload = true;
        this.setState({
          lastUpdated: Date.now(),
        });
      });
    } else {
      this.setState({
        lastUpdated: Date.now(),
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.lastUpdated !== nextState.lastUpdated;
  }

  componentDidUpdate() {
    if (this.shouldReload) {
      this.shouldReload = false;
      setImmediate(() => {
        this.reloadComponent(true);
      });
    }
  }

  get Component() {
    return this.props.children.type;
  }

  reportStatus(status, err) {
    if (!status) {
      throw new Error('Status is undefined', this.Component.displayName, status);
    }
    this.context.routerHookContext.setComponentStatus(this.Component, status, err);
  }

  reloadComponent(shouldReportStatus = false) {
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
      return;
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
          setImmediate(() => {
            this.setState(update(this.state, {
              lastUpdated: {
                $set: Date.now(),
              },
              childProps: {
                $merge: p,
              },
            }));
          });
        }
      },
    };

    series([
      callback => {
        setImmediate(() => {
          if (location !== this.props.location) {
            callback(ABORT);
            return;
          }
          if (initStatus === 'init') {
            callback();
            return;
          }
          const willEnterHooks = routerWillEnterHooks
            .map(key => routerHooks[key])
            .filter(f => f)
            .map(f => asyncify(f));
          mapSeries(willEnterHooks, (hook, cb) => {
            if (location === this.props.location) {
              setImmediate(() => {
                hook(args, cb);
              });
            }
          }, callback);
        });
      },
      callback => {
        setImmediate(() => {
          if (location !== this.props.location) {
            callback(ABORT);
            return;
          }
          if (shouldReportStatus) {
            this.reportStatus(ComponentStatus.DEFER);
          }
          this.setState({
            lastUpdated: Date.now(),
            status: ComponentStatus.DEFER,
          }, callback);
        });
      },
      callback => {
        setImmediate(() => {
          if (location !== this.props.location) {
            callback(ABORT);
            return;
          }
          const didEnterHooks = routerDidEnterHooks
            .map(key => routerHooks[key])
            .filter(f => f)
            .map(f => asyncify(f));
          mapSeries(didEnterHooks, (hook, cb) => {
            if (location === this.props.location) {
              setImmediate(() => {
                hook(args, cb);
              });
            }
          }, callback);
        });
      },
      callback => {
        setImmediate(() => {
          if (location !== this.props.location) {
            callback(ABORT);
            return;
          }
          if (shouldReportStatus) {
            this.reportStatus(ComponentStatus.DONE);
          }
          this.setState({
            lastUpdated: Date.now(),
            status: ComponentStatus.DONE,
          }, callback);
        });
      },
    ], err => {
      if (err && err === ABORT) {
        return;
      }
      if (shouldReportStatus) {
        this.reportStatus(ComponentStatus.DONE, err);
      }
      setImmediate(() => {
        this.setState({
          lastUpdated: Date.now(),
          status: ComponentStatus.DONE,
        });
      });
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
