/**
 * This module adds IdentityLink to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/identityLinkSubmodule
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook';

/** @type {Submodule} */
export const identityLinkSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'identityLink',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{idl_env:string}}
   */
  decode(value) {
    return { 'idl_env': value }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {function(callback:function)}
   */
  getId(configParams) {
    if (!configParams || typeof configParams.pid !== 'string') {
      utils.logError('identityLink submodule requires partner id to be defined');
      return;
    }
    // use protocol relative urls for http or https
    const url = `https://api.rlcdn.com/api/identity/envelope?pid=${configParams.pid}`;
    // if ats library is initialised, use it to retrieve envelope. If not use standard third party endpoint
    if (window.ats) {
      return function(callback) {
        window.ats.retrieveEnvelope(function (envelope) {
          if (envelope) {
            callback(JSON.parse(envelope).envelope);
          } else {
            getEnvelope(url, callback);
          }
        });
      }
    } else {
      return function (callback) {
        getEnvelope(url, callback);
      }
    }
  }
}
// return envelope from third party endpoint
function getEnvelope(url, callback) {
  ajax(url, response => {
    let responseObj;
    if (response) {
      try {
        responseObj = JSON.parse(response);
      } catch (error) {
        utils.logError(error);
      }
    }
    callback(responseObj.envelope);
  }, undefined, {method: 'GET', withCredentials: true});
}

submodule('userId', identityLinkSubmodule);
