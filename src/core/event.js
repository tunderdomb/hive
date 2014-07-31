/* hive.event */

var eventCache = {}

var event = {}

module.exports = event

/**
 * Register a custom event definition by name.
 * The definition is a function that, when called,
 * should handle custom logic, event registration, etc..
 * and return a function that tears down the controllers.
 *
 * Returns a function which calls the unregister returned by the definition,
 * but only if the arguments match with the original ones.
 *
 * @example
 *
 * var clickProxy = hud.event("clickproxy", function( element, listener, capture ){
   *   element.addEventListener("click", listener, capture)
   *   return function( element, listener, capture ){
   *     // these arguments are the same as in the closure
   *     // this function body is executed if the listener and the capture values match
   *     element.removeEventListener("click", listener, capture)
   *   }
   * })
 * var unregister = clickProxy(someElement, someFunction, true)
 * unregister(someFunction, true)
 *
 * @param {String} name - a name for this event
 * @param {Function} def - the definition of this event
 * */
event.define = function registerEvent( name, def ){
  // register a definition function
  return eventCache[name] = function addEventListener( element, listener, capture ){
    // normalize capture value for convenience
    capture = !!capture
    // when called, execute the custom logic and save the listener remover
    var doRemoveListener = def.apply(element, arguments)
    // and return a function that will call that remover
    return function removeEventListener( sameListener, sameCapture ){
      // but only if the same arguments are passed as before
      if ( sameListener === listener && sameCapture === capture ) {
        // execute custom tearing logic
        doRemoveListener(element, listener, capture)
      }
    }
  }
}

event.exists = function ( eventName ){
  return eventCache[eventName]
}

event.create = function ( eventName, context, args ){
  eventCache[eventName].apply(context, args)
}

