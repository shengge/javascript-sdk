const AV = require('./av');
const AppRouter = require('./app-router');
const {
  isNullOrUndefined,
} = require('./utils');
const {
  extend,
  isObject,
} = require('underscore');

const fillServerURLs = url => ({
  push: url,
  stats: url,
  engine: url,
  api: url,
});

function getDefaultServerURLs(appId, region) {
  if (region === 'us') return fillServerURLs('https://us-api.leancloud.cn');
  let id;
  switch (appId.slice(-9)) {
    case '-9Nh9j0Va':
      // TAB
      return fillServerURLs('https://e1-api.leancloud.cn');
    case '-MdYXbMMI':
      // US
      return fillServerURLs('https://us-api.leancloud.cn');
    default:
      id = appId.slice(0, 8).toLowerCase();
      return {
        push: `https://${id}.push.lncld.net`,
        stats: `https://${id}.stats.lncld.net`,
        engine: `https://${id}.engine.lncld.net`,
        api: `https://${id}.api.lncld.net`,
      };
  }
}

let _disableAppRouter = false;

/**
 * URLs for services
 * @typedef {Object} ServerURLs
 * @property {String} [api] serverURL for api service
 * @property {String} [engine] serverURL for engine service
 * @property {String} [stats] serverURL for stats service
 * @property {String} [push] serverURL for push service
 */

/**
  * Call this method first to set up your authentication tokens for AV.
  * You can get your app keys from the LeanCloud dashboard on http://leancloud.cn .
  * @function AV.init
  * @param {Object} options
  * @param {String} options.appId application id
  * @param {String} options.appKey application key
  * @param {String} [options.masterKey] application master key
  * @param {String} [options.region='cn'] region
  * @param {Boolean} [options.production]
  * @param {String|ServerURLs} [options.serverURLs] URLs for services. if a string was given, it will be applied for all services.
  * @param {Boolean} [options.disableCurrentUser=false]
  */
AV.init = function init(options, ...params) {
  if (!isObject(options)) {
    return AV.init({
      appId: options,
      appKey: params[0],
      masterKey: params[1],
      region: params[2],
    });
  }
  const {
    appId,
    appKey,
    masterKey,
    hookKey,
    region = 'cn',
    serverURLs,
    disableCurrentUser = false,
    production,
    realtime,
  } = options;
  if (AV.applicationId) throw new Error('SDK is already initialized.');
  if (process.env.CLIENT_PLATFORM && masterKey) console.warn('MasterKey is not supposed to be used in browser.');
  AV._config.applicationId = appId;
  AV._config.applicationKey = appKey;
  AV._config.masterKey = masterKey;
  if (!process.env.CLIENT_PLATFORM) AV._config.hookKey = hookKey || process.env.LEANCLOUD_APP_HOOK_KEY;
  if (typeof production !== 'undefined') AV._config.production = production;
  if (typeof disableCurrentUser !== 'undefined') AV._config.disableCurrentUser = disableCurrentUser;
  AV._appRouter = new AppRouter(AV);
  const disableAppRouter = _disableAppRouter || typeof serverURLs !== 'undefined' || region !== 'cn';
  AV._setServerURLs(extend(
    {},
    getDefaultServerURLs(appId, region),
    AV._config.serverURLs,
    serverURLs
  ), disableAppRouter);
  if (realtime) {
    AV._config.realtime = realtime;
  } else if (AV._sharedConfig.liveQueryRealtime) {
    AV._config.realtime = new AV._sharedConfig.liveQueryRealtime({
      appId,
      region,
    });
  }
};

// If we're running in node.js, allow using the master key.
if (!process.env.CLIENT_PLATFORM) {
  AV.Cloud = AV.Cloud || {};
  /**
   * Switches the LeanCloud SDK to using the Master key.  The Master key grants
   * priveleged access to the data in LeanCloud and can be used to bypass ACLs and
   * other restrictions that are applied to the client SDKs.
   * <p><strong><em>Available in Cloud Code and Node.js only.</em></strong>
   * </p>
   */
  AV.Cloud.useMasterKey = () => {
    AV._config.useMasterKey = true;
  };
}

/**
 * Call this method to set production environment variable.
 * @function AV.setProduction
 * @param {Boolean} production True is production environment,and
 *  it's true by default.
 */
AV.setProduction = (production) => {
  if (!isNullOrUndefined(production)) {
    AV._config.production = production ? 1 : 0;
  } else {
    // change to default value
    AV._config.production = null;
  }
};

AV._setServerURLs = (urls, disableAppRouter = true) => {
  if (typeof urls !== 'string') {
    extend(AV._config.serverURLs, urls);
  } else {
    AV._config.serverURLs = fillServerURLs(urls);
  }
  if (disableAppRouter) {
    if (AV._appRouter) {
      AV._appRouter.disable();
    } else {
      _disableAppRouter = true;
    }
  }
};
/**
 * set server URLs for services.
 * @function AV.setServerURLs
 * @since 3.0.0
 * @param {String|ServerURLs} urls URLs for services. if a string was given, it will be applied for all services.
 * You can also set them when initializing SDK with `options.serverURLs`
 */
AV.setServerURLs = urls => AV._setServerURLs(urls);

// backword compatible
AV.initialize = AV.init;

const defineConfig = property => Object.defineProperty(AV, property, {
  get() {
    return AV._config[property];
  },
  set(value) {
    AV._config[property] = value;
  },
});

['applicationId', 'applicationKey', 'masterKey', 'hookKey'].forEach(defineConfig);
