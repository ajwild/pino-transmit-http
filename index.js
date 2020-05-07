'use strict'

const throttle = require('lodash.throttle')
const debounce = require('lodash.debounce')
const httpSend = require('./lib/http-send')

const defaultOptions = {
  throttle: 500,
  debounce: null,
  url: '/log',
  useSendBeacon: true,
  method: 'POST',
  fetch: null,
  headers: null,
  onError: null,
  prepareBody: null,
  prepareHeaders: null
}

function transmitHttp (inOpts) {
  const opts = Object.assign({}, defaultOptions, inOpts)

  let collection = []
  let isUnloading = false

  async function rawSend () {
    try {
      // short circuit if the method is called without any logs collected
      if (collection.length === 0) {
        return
      }

      // send headers to prepareHeaders function if provided
      opts.headers = (typeof opts.prepareHeaders === 'function')
        ? await opts.prepareHeaders(opts.headers)
        : opts.headers

      // convert collected logs to string and clear the collector array
      let data = (typeof opts.prepareBody === 'function')
        ? await opts.prepareBody(collection)
        : JSON.stringify(collection)
      collection = []

      const sendHeaders = (opts.headers)
        ? { headers: Object.assign({}, opts.headers) }
        : {}
      const sendOpts = Object.assign({}, opts, sendHeaders)

      return httpSend(data, isUnloading, sendOpts)
        .catch(function catchFn (e) {
          if (typeof opts.onError === 'function') {
            opts.onError(e, data, sendOpts.headers)
          } else {
            console.error(e)
          }
        })
    } catch (e) {
      console.error(e)
    }
  }

  let send
  if (opts.debounce !== null && opts.debounce !== undefined) {
    send = debounce(rawSend, opts.debounce)
  } else if (opts.throttle !== null && opts.debounce !== undefined) {
    send = throttle(rawSend, opts.throttle, { trailing: true, leading: false })
  } else {
    console.warn(
      'pino-transmit-http: Either throttle or debounce option must be passed to pino-transmit-http. Falling back to throttle by %dms',
      defaultOptions.throttle
    )
    send = throttle(rawSend, defaultOptions.throttle, { trailing: true, leading: false })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unload', function onUnload () {
      isUnloading = true // request the rawSend method to send logs synchroneously
      const oldSend = send
      send = rawSend // directly send new incoming logs

      if (typeof oldSend.flush === 'function') {
        oldSend.flush()
      }
    })
  }

  return {
    level: opts.level,
    send: function (level, logEvent) {
      try {
        collection.push(logEvent)
        send()
      } catch (e) {
        console.error('pino-transmit-http: Failed to transmit logs')
      }
    },
    flush: async function () {
      if (typeof send.flush === 'function') {
        return send.flush()
      }
      return rawSend()
    }
  }
};

module.exports = transmitHttp
