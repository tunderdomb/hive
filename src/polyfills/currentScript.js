if ( typeof document.currentScript == "undefined" && document.__defineGetter__ ) {
  document.__defineGetter__("currentScript", function (){
    try {
      throw new Error()
    }
    catch ( e ) {
      var qualifiedUrl = location.protocol + "//" + location.host
        , srcs = e.stack.match(new RegExp(qualifiedUrl + ".*?\\.js", 'g'))
        , src = srcs[srcs.length - 1]
        , absoluteUrl = src.replace(qualifiedUrl, "")
        , scripts = document.scripts
        , i = -1
        , l = scripts.length
      while ( ++i < l ) {
        if ( scripts[i][0] == "/" && scripts[i].src == absoluteUrl || scripts[i].src == src ) {
          return scripts[i]
        }
      }
    }
  })
}