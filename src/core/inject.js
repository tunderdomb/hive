/* hive.inject */

module.exports = inject

var LOADING = 1
  , LOADED = 2
  , FAILED = 3

function normalizeSrc( src ){
  if ( src[0] == "/" ) {
    return location.protocol + "//" + location.host + src
  }
  else {
    return src
  }
}

function cache( src ){
  cache[normalizeSrc(src)] = LOADED
}
function fail( src ){
  cache[normalizeSrc(src)] = FAILED
}
function loading( src ){
  cache[normalizeSrc(src)] = LOADING
}
function isLoaded( src ){
  return cache[normalizeSrc(src)] == LOADED
}
function isLoading( src ){
  return cache[normalizeSrc(src)] == LOADING
}
function isFailed( src ){
  return cache[normalizeSrc(src)] == FAILED
}

function asyncLoader( load ){
  return function ( sources, done ){
    if ( typeof sources == "string" ) {
      sources = [sources]
    }
    var failed
      , toLoad = sources.length

    function next( error, src ){
      if ( error ) {
        fail(src)
        failed = failed || []
        failed.push({
          src: src,
          error: error
        })
      }
      else {
        cache(src)
      }
      if ( !--toLoad ) {
        done(failed)
      }
    }

    if ( !toLoad ) done()
    else sources.forEach(function ( src ){
      if ( isLoaded(src) ) {
        next(null, src)
      }
      else if ( isLoading(src) ) {
        // TODO: add a listener to a ready queue
      }
      else {
        loading(src)
        load(src, function ( e ){
          next(e, src)
        })
      }
    })
  }
}

function syncLoader( load ){
  return function ( sources, done ){
    if ( typeof sources == "string" ) {
      sources = [sources]
    }
    var failed
      , current = -1
      , toLoad = sources.length

    function next( error, src ){
      if ( error ) {
        fail(src)
        failed = failed || []
        failed.push({
          src: src,
          error: error
        })
      }
      else {
        cache(src)
      }
      if ( ++current == toLoad ) {
        done(failed)
      }
      else {
        if ( isLoaded(src) ) {
          next(null, src)
        }
        else if ( isLoading(src) ) {
          // TODO: add a listener to a ready queue
        }
        else {
          loading(src)
          load(sources[current], function ( e ){
            next(e, sources[current])
          })
        }
      }
    }

    if ( !toLoad ) done()
    else next()
  }
}

function injectScript( src, next ){
  var ok
    , error = null
    , script = document.createElement("script")
  script.onload = function (){
    ok || next(error)
    ok = true
  }
  script.onerror = function ( e ){
    ok || next(error = e)
    ok = true
  }
  document.head.appendChild(script)
  script.async = false
  script.src = src
}

function inject( srcs, done ){
  if ( !Array.isArray(srcs) ) srcs = [srcs]
  var scripts = srcs.filter(function ( src ){
    return /\.js$/.test(src)
  })
  var css = srcs.filter(function ( src ){
    return /\.css$/.test(src)
  })
  var toLoad = 0
  if ( scripts.length ) ++toLoad
  if ( css.length ) ++toLoad
  if ( !toLoad ) done()
  var next = function (){
    if ( !--toLoad ) done()
  }
  if ( scripts.length ) inject.script(scripts, next)
  if ( css.length ) inject.css(css, next)
}

inject.script = asyncLoader(injectScript)

inject.scriptSync = syncLoader(injectScript)

inject.css = asyncLoader(function ( src, next ){
  var ok
    , error = null
    , link = document.createElement("link")
  link.onload = function ( e ){
    ok || next(error)
    ok = true
  }
  link.onerror = function ( e ){
    ok || next(error = e)
    ok = true
  }
  document.head.appendChild(link)
  link.src = src
})
